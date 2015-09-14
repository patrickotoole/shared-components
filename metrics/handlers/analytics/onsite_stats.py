import pandas
import tornado.web
import ujson
import json
import numpy as np

from twisted.internet import defer

from lib.helpers import *
from lib.mysql.helpers import run_mysql_deferred
from lib.query.MYSQL import ONSITE_STATS

from handlers.base import BaseHandler
from handlers.funnel.funnel_auth import FunnelAuth
from handlers.admin.reporting.base import AdminReportingBaseHandler

class OnSiteStatsHandler(FunnelAuth, BaseHandler):

    def initialize(self, db=None, **kwargs):
        self.db = db

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("admin/reporting/target_list.html",data=o)

        yield default, (data,)

    @defer.inlineCallbacks
    def get_data(self, advertiser):
        where = "1=1"
        if advertiser:
            where = where + " and advertiser = '%s'" % advertiser
        q = ONSITE_STATS % where
        df = yield run_mysql_deferred(self.db,q)
        self.get_content(df)

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self, meta=False):
        formatted = self.get_argument("format",False)
        advertiser = self.get_argument("advertiser", False)

        if not advertiser:
            advertiser = self.current_advertiser_name

        self.get_data(advertiser)
