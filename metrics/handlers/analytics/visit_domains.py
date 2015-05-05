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

DEFAULT_INTERVAL = "minute"

QUERY = "SELECT * FROM rockerbox.visitor_domains "

class VisitDomainsHandler(BaseHandler, AnalyticsBase):
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None
        self.query = QUERY

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.render("analysis/visit_urls.html", data=df)
        yield default, (data,)


    @defer.inlineCallbacks
    def get_domains(self, uid, date_clause):
        df = yield self.defer_get_domains(uid, date_clause)
        print df
        self.get_content(df)

    @decorators.deferred
    def defer_get_domains(self, uid, date_clause):
        where = []

        if not uid:
            raise Exception("Must specify url using url=")

        uids = uid.split(",")

        df = pandas.DataFrame(self.get_w_in(uids, date_clause))

        return df

    def get_w_in(self, uids, date_clause):
        where = 'where uid IN {}'
        if date_clause:
            where = where + " and {}".format(date_clause)
        in_clause = self.make_in_clause(uids)
        WHERE = where.format(in_clause)
        logging.info(self.query + WHERE)
        return self.cassandra.execute(self.query + WHERE)

    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        uid = self.get_argument("uid", [])
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")

        date_clause = self.make_date_clause("date", date, start_date, end_date)

        if formatted:
            self.get_domains(
                uid,
                date_clause
            )
        else:
            self.get_content(pandas.DataFrame())
