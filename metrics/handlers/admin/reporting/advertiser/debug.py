import pandas
import tornado.web
import ujson

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred, run_spark_sql_session_deferred
from lib.query.HIVE import DEBUG_QUERY
from ..base import AdminReportingBaseHandler

OPTIONS = {
    "default": {
        "meta": {
            "groups": ["campaign_id", "bid_result", "is_valid", "deal_transacted"],
            "fields": ["count"]
            }
        },
    
    "campaign": {
        "meta": {
            "groups": ["date", "id", "winning_member_id", "bid_result", "is_valid", "deal_transacted"],
            "fields": []
            }
        }
    }

GROUPS = {
    "date": "date",
    "hour": "hour",
    "id" : "id",
    "is_valid" : "is_valid",
    "bid_result" : "bid_result",
    "campaign_id" : "campaign_id",
    "winning_member_id" : "winning_member_id",
    "deal_transacted" : "deal_transacted",
    "an_user_id" : "an_user_id",
    "an_placement_id" : "an_placement_id",
    "dma" : "dma",
    "country" : "country",
    "page_url" : "page_url",
    "ad_format" : "ad_format",
    "ext_auction_id" : "ext_auction_id",
    "width" : "width",
    "height" : "height",
    "wrong_size" : "wrong_size"
    }

FIELDS = {
    "our_bid" : "our_bid",
    "net_winning_price" : "net_winning_price",
    "second_net_price" : "second_net_price",
    "soft_floor" : "soft_floor",
    "hard_floor" : "hard_floor",
    "detail" : "detail",
    "result" : "result",
    "count": "count(*)"
    }

WHERE = {
    "page_url": "page_url LIKE '%%%(page_url)s%%'",
    "id": "id = '%(id)s'",
    "is_valid": "is_valid = '%(is_valid)s'",
    "bid_result": "bid_result = '%(bid_result)s'",
    "campaign_id": "campaign_id = '%(campaign_id)s'",
    "winning_member_id": "winning_member_id = '%(winning_member_id)s'",
    "deal_transacted": "deal_transacted = '%(deal_transacted)s'",
    "an_user_id": "an_user_id = '%(an_user_id)s'",
    "an_placement_id": "an_placement_id = '%(an_placement_id)s'",
    "dma": "dma = '%(dma)s'",
    "country": "country = '%(country)s'",
    "page_url": "page_url = '%(page_url)s'",
    "ad_format": "ad_format = '%(ad_format)s'",
    "ext_auction_id": "ext_auction_id = '%(ext_auction_id)s'",
    "width": "width = '%(width)s'",
    "height": "height = '%(height)s'",
    "wrong_size": "wrong_size = '%(wrong_size)s'"    
    }


class DebugReportingHandler(AdminReportingBaseHandler):

    QUERY = DEBUG_QUERY
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS

    OPTIONS = OPTIONS

    def initialize(self, db=None, api=None, hive=None, spark_sql=None):
        self.db = db 
        self.api = api
        self.hive = hive
        self.spark_sql = spark_sql

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("admin/reporting/target_list.html",data=o)

        yield default, (data,)

    @defer.inlineCallbacks
    def get_data(self,query,groupby=False,wide=False):

        query_list = [
            "SET spark.sql.shuffle.partitions=8",
            query
        ]
        raw = yield run_spark_sql_session_deferred(self.spark_sql,query_list)


        formatted = self.format_data(
            pandas.DataFrame(raw),
            groupby,
            wide
        )

        self.get_content(formatted)

    def format_data(self, u, groupby, wide):
        for field in FIELDS:
            if field in u.columns:
                try:
                    try:
                        u[field] = u[field].astype(int)
                    except:
                        u[field] = u[field].astype(float) 
                except:
                    logging.warn("Could not format %s" % field)
                    pass

        if groupby and wide:
            u = u.set_index(groupby).sort_index()
            u = u.stack().unstack(wide)

            new_index = [i if i else "" for i in u.index.names]
            u.index.rename(new_index,inplace=True)
            u = u.reset_index().reset_index()
            u.rename(columns={"index":"__index__"},inplace=True)

        return u

    def get_meta_group(self,default="default"):
        campaign = self.get_argument("campaign_id", False)
    
        if campaign:
            return "campaign"

        return default

    @tornado.web.asynchronous
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include","").split(",")
        wide = self.get_argument("wide",False)
        
        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)
        
        meta_data["is_wide"] = wide
        
        if meta:
            self.write(ujson.dumps(meta_data))
            self.finish()

        elif formatted:
            params = self.make_params(
                meta_data.get("groups",[]),
                meta_data.get("fields",[]),
                self.make_where()
            )
            self.get_data(
                self.make_query(params),
                meta_data.get("groups",[]),
                wide
            )

        else:
            self.get_content(pandas.DataFrame())
