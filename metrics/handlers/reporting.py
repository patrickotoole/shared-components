import tornado.web
import ujson
import pandas
import StringIO
from base import BaseHandler
from lib.helpers import *

IMPS_QUERY = """select 0 is_valid, v3.* from v3_reporting v3 where v3.external_advertiser_id= %(advertiser_id)s and v3.active = 1 and v3.deleted = 0"""

CONVERSION_QUERY = """select is_valid, 0 id, 0 imps, 0 clicks, campaign_id, creative_id, 0 media_cost, external_advertiser_id, timestamp(DATE_FORMAT(conversion_time, "%%Y-%%m-%%d %%H:00:00")) date, last_activity, deleted, 0 cpm_multiplier, active, NULL notes from conversion_reporting cr where cr.external_advertiser_id = %(advertiser_id)s and cr.active = 1 and cr.deleted = 0"""

UNION_QUERY = IMPS_QUERY + " UNION ALL (" + CONVERSION_QUERY + ")"

BUCKET_QUERY = "select campaign_id from campaign_bucket where bucket_name like '%%%(bucket)s%%' and external_advertiser_id = %(advertiser)s"

PARTITIONED_QUERY = "select campaign, seller, referrer, datetime date, imps, clicks, cost, is_valid from campaign_domain_partitioned_new where %s"

class ReportingHandler(BaseHandler):
    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

    def load_df(self):
        return pandas.DataFrame().load("/root/v3.pnds")

    def pull_advertiser(self,advertiser_id):
        return self.db.select_dataframe(UNION_QUERY % {"advertiser_id":advertiser_id})

    def pull_campaigns(self,campaign_ids):
        campaign_where = "(" + " or ".join(["campaign = %s" % i for i in campaign_ids]) + ")"

        l = list(self.hive.session_execute([
            "set shark.map.tasks=3",
            "set mapred.reduce.tasks = 3",
             PARTITIONED_QUERY % campaign_where
        ]))

        return pandas.DataFrame(l)

    def pull_bucket(self,bucket,advertiser):
        campaign_ids = self.db.select_dataframe( 
            BUCKET_QUERY % {"bucket": bucket, "advertiser": advertiser}
        ).campaign_id.values
        return self.pull_campaigns(campaign_ids)

    def pull_campaign(self,campaign_id):
        return self.pull_campaigns([campaign_id])
                
    @tornado.web.authenticated
    @decorators.formattable
    def get(self):

        advertiser_id = self.get_secure_cookie("advertiser")

        campaign_id = self.get_argument("campaign",False)
        campaign_bucket = self.get_argument("group",False)
        strategy = self.get_argument("strategy",False)

        if self.get_argument("format",False):
            if campaign_id:
                data = self.pull_campaign(campaign_id)
            elif advertiser_id and campaign_bucket:
                data = self.pull_bucket(campaign_bucket,advertiser_id)
            elif advertiser_id:
                data = self.pull_advertiser(advertiser_id)
        else:
            data = ""

        def default(self,data):
            if campaign_id or campaign_bucket:
                self.render("reporting/_campaign.html",stuff=data, advertiser_id=advertiser_id)
            elif strategy:
                self.render("reporting/_advertiser.html",stuff=data, advertiser_id=advertiser_id)
            elif advertiser_id:
                self.render("reporting/_advertiser_bucket.html",stuff=data, advertiser_id=advertiser_id)

        yield default, (data,)



    def post(self):
        pass
    
