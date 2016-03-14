import tornado.web
import ujson
import pandas
import StringIO
import logging

import re

from ..base import BaseHandler
from analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *

def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates

def filter_fraud(df):

    uids = df.groupby("uid")["uid"].count()
    bad_uids = list(uids[uids > 1000].index)

    bad_domain_uids = list(set(df[df.domain == "pennlive.com"].uid))
    df = df[~df.uid.isin(bad_uids) & ~df.uid.isin(bad_domain_uids)]

    return df



class ServedEventBase(object):

    @decorators.deferred
    def defer_get_served(self, uids, source):
        xx = self.paginate_get_served(uids, source)
        df = pandas.DataFrame(xx)
        return df

 
    def paginate_get_served(self, uids, source):
        DOMAIN_SELECT = "select * from rockerbox.served_uids where uid = ? and date = ? and source = ?"
        statement = self.cassandra.prepare(DOMAIN_SELECT)

        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)

        logging.info("Start get served from futures:")

        dates = build_datelist(30)

        prepped = [[u, d, source] for u in uids for d in dates]
        results, _ = FutureHelpers.future_queue(prepped,execute,simple_append,120,[],"DUMMY_VAR")

        logging.info("End get served from futures.")

        return results


class ServedEventsHandler(BaseHandler, AnalyticsBase, ServedEventBase):

    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None

    @defer.inlineCallbacks
    def get_events(self, uid, source, kind):
        uids = uid.split(",")
        df = yield self.defer_get_served(uids, source)

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

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        uid = self.get_argument("uid", [])
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        kind = self.get_argument("kind", "")
        source = self.current_advertiser_name

        date_clause = self.make_date_clause("date", date, start_date, end_date)

        if formatted:
            self.get_events(
                uid,
                source,
                kind
            )

        else:
            self.get_content(pandas.DataFrame())
    
    @tornado.web.authenticated
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
        source = self.current_advertiser_name

        date_clause = self.make_date_clause("date", date, start_date, end_date)

        uid = ','.join(payload["uids"])

        if formatted:
            self.get_events(
                uid,
                source,
                kind
            )
        
        else:
            self.get_content(pandas.DataFrame())
