import tornado.web
import ujson
import pandas
import StringIO
from twisted.internet import defer

from handlers.reporting.reporting import ReportingHandler
from lib.helpers import *

from lib.query.MYSQL import *
import lib.query.helpers as query_helpers
from lib.mysql.helpers import run_mysql_deferred

class AdminClientReportingHandler(ReportingHandler):
 
    @decorators.deferred
    def advertiser_name_to_id(self, advertiser):
        q = ADVERTISER_NAME_TO_ID.format(advertiser)
        df = self.db.select_dataframe(q)
        print df
        return df.external_advertiser_id.iloc[0]

    @decorators.deferred
    def pull_advertiser(self,advertiser_id):
        start_date = self.get_argument("start_date",False)
        params = {"advertiser_id": advertiser_id,"date":""}
            
        q = ADMIN_MATERIALIZED_VIEW % params
        print q
        return self.db.select_dataframe(q)


    @defer.inlineCallbacks
    def get_data(self,_format,export, advertiser):

        advertiser_id = yield self.advertiser_name_to_id(advertiser)
        user = self.current_user

        print "Advertiser: {}".format(advertiser_id)

        if _format is False:
            data = ""
        elif export:
            data = yield self.pull_advertiser_export(advertiser_id)
        else:
            data = yield self.pull_advertiser(advertiser_id)

        self.get_content(data,advertiser_id,user)

    @tornado.web.asynchronous
    def get(self):

        _format = self.get_argument("format",False)
        export = self.get_argument("export", False)
        advertiser = self.get_argument("advertiser")

        self.get_data(_format,export, advertiser)
