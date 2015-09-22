import tornado.web
import ujson
import pandas
import StringIO
import logging

from ..base import BaseHandler
from analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *



DEFAULT_INTERVAL = "minute"

QUERY = "SELECT * FROM rockerbox.visitor_domains_2 "

class VisitDomainBase(object):
    
    @decorators.deferred
    def defer_get_domains(self, uids, date_clause):
        where = []
        xx = self.paginate_get_w_in(uids, date_clause)
        df = pandas.DataFrame(xx)

        return df

    def future_get_w_in(self,uids,date_clause):
        where = 'where uid IN {}'
        if date_clause:
            where = where + " and {}".format(date_clause)
        in_clause = self.make_in_clause(uids)
        WHERE = where.format(in_clause)
        logging.info("Started domains request for %s uids..." % len(uids))

        query = QUERY + WHERE

        return self.cassandra.execute_async(query)
 

    def paginate_get_w_in(self, uids, date_clause):

        DOMAIN_SELECT = "select * from rockerbox.visitor_domains_2 where uid = ?"
        statement = self.cassandra.prepare(DOMAIN_SELECT)
        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)
        
        prepped = [[u] for u in uids]
        results = FutureHelpers.future_queue(prepped,execute,simple_append,60,[])
        results = results[0]

        return results

    def get_w_in(self, uids, date_clause):
        where = 'where uid IN {}'
        if date_clause:
            where = where + " and {}".format(date_clause)
        in_clause = self.make_in_clause(uids)
        WHERE = where.format(in_clause)
        logging.info("Started domains request for %s uids..." % len(uids))

        query = QUERY + WHERE

        return self.cassandra.execute(query)

class VisitDomainsHandler(BaseHandler, AnalyticsBase,VisitDomainBase):

    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None
        self.query = QUERY

    @defer.inlineCallbacks
    def get_domains(self, uid, date_clause, kind):
        uids = uid.split(",")
        df = yield self.defer_get_domains(uids, date_clause)

        if len(df) > 0:
            if kind == "domains":
                df = df.groupby("domain").uid.nunique().reset_index()

        self.get_content(df)

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.render("analysis/visit_urls.html", data=df)
        yield default, (data,)

    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        uid = self.get_argument("uid", [])
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        kind = self.get_argument("kind", "")

        date_clause = self.make_date_clause("date", date, start_date, end_date)

        if formatted:
            self.get_domains(
                uid,
                date_clause,
                kind
            )

        else:
            self.get_content(pandas.DataFrame())

    @tornado.web.asynchronous
    def post(self):
        #print tornado.escape.json_decode(self.request.body)
        formatted = self.get_argument("format", False)
        payload = tornado.escape.json_decode(self.request.body)
        
        if "uids" not in payload:
            raise Exception("Please submit a json object containing a list of uids called 'uids'")

        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        kind = self.get_argument("kind", "")

        date_clause = self.make_date_clause("date", date, start_date, end_date)

        uid = ','.join(payload["uids"])

        if formatted:
            self.get_domains(
                uid,
                date_clause,
                kind
                )
        
        else:
            self.get_content(pandas.DataFrame())
