import tornado.web
import ujson
import pandas
import StringIO
from ..base import BaseHandler
from lib.helpers import *

from lib.query.MYSQL import *
from lib.query.HIVE import *
import lib.query.helpers as query_helpers

from base import ReportingBase
 

class DomainReportingHandler(BaseHandler,ReportingBase):

    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

    @tornado.web.authenticated
    @decorators.formattable
    def get(self):
        advertiser = self.current_advertiser
        _format  = self.get_argument("format",False)

        campaign = self.get_argument("campaign",False)
        bucket   = self.get_argument("group",False)

        if _format:
            if campaign:
                data = self.pull_hive_campaigns([campaign])
            elif bucket:
                data = self.pull_bucket(bucket,advertiser)
            else:
                data = self.pull_advertiser_domain(advertiser)
        else:
            data =""

        def default(self,data):

            self.render("reporting/_domain.html", advertiser_id=advertiser)

        yield default, (data,)
 
