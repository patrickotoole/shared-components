import tornado.web
import pandas
import logging

from handlers.base import BaseHandler
from ...analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from ..base import VisitDomainBase


class VisitDomainsHandler(BaseHandler, AnalyticsBase, VisitDomainBase):

    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None
        self.DOMAIN_SELECT = "select uid, domain, timestamp from rockerbox.visitor_domains_full where uid = ?"

    @defer.inlineCallbacks
    def get_domains(self, uid, date_clause, kind):
        uids = uid.split(",")
        df = yield self.defer_get_domains(uids, date_clause)

        if len(df) > 0 and kind == "domains":
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

        date_clause = self.make_date_clause("date", date, start_date, end_date)

        if formatted:
            self.get_domains(uid, date_clause, kind)
        else:
            self.get_content(pandas.DataFrame())
    
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def post(self):
        
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
            self.get_domains(uid, date_clause, kind)
        else:
            self.get_content(pandas.DataFrame())
