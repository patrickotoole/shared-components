import tornado.web
import ujson
import pandas
import StringIO
from ..base import BaseHandler
from lib.helpers import *

from lib.query.MYSQL import *
from lib.query.HIVE import *
import lib.query.helpers as query_helpers

class ReportingBase(BaseHandler):

    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

    def pull_advertiser(self,advertiser_id):
        params = {"advertiser_id": advertiser_id}
        q = UNION_QUERY % params
        return self.db.select_dataframe(q)

    def pull_advertiser_bucket(self,advertiser,bucket):
        params = {"bucket": bucket, "advertiser": advertiser}
        q = BUCKET_QUERY % params
        return self.db.select_dataframe(q)

    def pull_campaigns(self,campaign_ids):
        """
        # Pull reporting data by campaign_ids
        """
        params = query_helpers.__whereor__("campaign",campaign_ids)
        q = PARTITIONED_QUERY % params 

        l = list(self.hive.session_execute([
            "set shark.map.tasks=3",
            "set mapred.reduce.tasks = 3",
            q 
        ]))

        return pandas.DataFrame(l)

    def pull_bucket(self,bucket,advertiser):
        """
        # Pull reporting data by bucket_name, advertiser id
        """
        campaign_buckets = self.pull_advertiser_bucket(advertiser,bucket)
        campaign_ids = campaign_buckets.campaign_id.values
        return self.pull_campaigns(campaign_ids)

    def pull_campaign(self,campaign_id):
        """
        # Pull a specific campaign
        """
        ids = [campaign_id]
        return self.pull_campaigns(ids)
 
    
class ReportingHandler(ReportingBase):

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
        strategy = self.get_argument("strategy",False)

        if _format:
            if campaign:
                data = self.pull_campaign(campaign)
            elif bucket:
                data = self.pull_bucket(bucket,advertiser)
            else:
                data = self.pull_advertiser(advertiser)
        else:
            data =""

        def default(self,data):
            # nolonger have multiple templates/ views of reporting
            if campaign or bucket:
                template = "campaign.html"
            elif strategy:
                template = "advertiser.html"
            else:
                template = "advertiser_bucket.html"

            self.render("reporting/_reporting.html", advertiser_id=advertiser)

        yield default, (data,)

