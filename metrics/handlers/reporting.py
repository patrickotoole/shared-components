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

class ReportingHandler(BaseHandler):
    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

    def load_df(self):
        return pandas.DataFrame().load("/root/v3.pnds")

    def pull_advertiser(self,advertiser_id):
        return self.db.select_dataframe(UNION_QUERY % {"advertiser_id":advertiser_id})

    def pull_bucket(self,bucket,advertiser):
        campaigns = self.db.select_dataframe(BUCKET_QUERY % {"bucket": bucket, "advertiser": "302568"})
        campaign_where = "(" + " or ".join(["campaign = %s" % i for i in campaigns.campaign_id.values]) + ")"
        print campaign_where

        l = list(self.hive.execute("select * from campaign_domain_cached where %s" % campaign_where))

        return pandas.DataFrame(l)

    def pull_campaign(self,campaign_id):
        """
        try:
            p = pandas.DataFrame().load("/root/saved.pnds")
        except:
            g = self.hive.execute("select * from campaign_domain_cached where campaign = %s" % campaign_id)
            l = list(g)
            p = pandas.DataFrame(l)
            p.save("/root/saved.pnds")
        """
        g = self.hive.execute("select * from campaign_domain_cached where campaign = %s" % campaign_id)
        l = list(g)
        p = pandas.DataFrame(l)

        return p
                
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
    
