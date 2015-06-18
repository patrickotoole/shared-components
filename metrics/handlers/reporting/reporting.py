import tornado.web
import ujson
import pandas
import StringIO
from twisted.internet import defer

from ..base import BaseHandler
from lib.helpers import *

from lib.query.MYSQL import *
from lib.query.HIVE import *
import lib.query.helpers as query_helpers
from lib.mysql.helpers import run_mysql_deferred 


def make_run_query(err_msg):
    def run_query(fn):
        
        def run(self,*args):
            db, q, params = fn(self,*args)
            df = db.select_dataframe(q % params)
            if df.empty:
                raise Exception(err_msg % params)
            return df

        return run
    return run_query
        

class ReportingBase(object):
    """
    Interacts with the database to pull reporting data

    TODO: split this into multiple classes for specific report types
    """

    ERR_MSG = "No campaigns for "

    def initialize(self, db, hive, spark_sql=None):
        self.db = db 
        self.hive = hive

    @make_run_query(ERR_MSG + "advertiser %(advertiser_id)s")
    def get_advertiser_campaigns(self,advertiser_id):
        params = {"advertiser_id": advertiser_id}
        return (self.db, CAMPAIGN_QUERY, params)

    @make_run_query(ERR_MSG + "advertiser %(advertiser_id)s, campaign_bucket %(bucket)s")
    def get_advertiser_bucket_campaigns(self,advertiser,bucket):
        params = {"bucket": bucket, "advertiser_id": advertiser}
        return (self.db, BUCKET_QUERY, params)

    @decorators.deferred
    def pull_advertiser(self,advertiser_id):
        start_date = self.get_argument("start_date",False)
        params = {"advertiser_id": advertiser_id,"date":""}
            
        q = MATERIALIZED_VIEW % params
        print q
        return self.db.select_dataframe(q)

    @decorators.deferred
    def pull_advertiser_export(self,advertiser_id):
        params = {"advertiser_id": advertiser_id}
        q = IMPS_CONVERSIONS_EXPORT_QUERY % params
        return self.db.select_dataframe(q)

    def pull_hive_campaigns(self,campaign_ids):
        """
        # Pull reporting data by campaign_ids
        """
        params = query_helpers.__whereor__("campaign",campaign_ids)
        q = PARTITIONED_QUERY_LESS % params 

        l = list(self.hive.session_execute([
            "set shark.map.tasks=3",
            "set mapred.reduce.tasks = 3",
            q 
        ]))

        return pandas.DataFrame(l)[["campaign","imps","referrer","date"]]

    def pull_bucket(self,bucket,advertiser):
        """
        # Pull reporting data by bucket_name, advertiser id
        """
        campaign_buckets = self.get_advertiser_bucket_campaigns(advertiser,bucket)
        campaign_ids = campaign_buckets.campaign_id.values
        return self.pull_hive_campaigns(campaign_ids)

    def pull_advertiser_domain(self,advertiser):
        campaign_ids = self.get_advertiser_campaigns(advertiser).campaign_id.values
        print campaign_ids
        return self.pull_hive_campaigns(campaign_ids)
        

class ReportingHandler(BaseHandler,ReportingBase):

    def initialize(self, db=None, api=None, hive=None, spark_sql=None):
        self.db = db
        self.api = api
        self.hive = hive

    @decorators.formattable
    def get_content(self,data,advertiser,user):

        def default(self,data):
            self.render("reporting/_reporting.html", advertiser_id=advertiser, user_id=user)

        yield default, (data,)
 

    @defer.inlineCallbacks 
    def get_data(self,_format,export):

        advertiser = self.current_advertiser
        user = self.current_user

        if _format is False:
            data = ""
        elif export:
            data = yield self.pull_advertiser_export(advertiser)
        else:
            data = yield self.pull_advertiser(advertiser)

        self.get_content(data,advertiser,user)  

    @tornado.web.authenticated
    @tornado.web.asynchronous  
    def get(self):

        _format = self.get_argument("format",False)
        export = self.get_argument("export", False)

        self.get_data(_format,export)
