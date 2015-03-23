import pandas
import tornado.web
import ujson
import numpy as np

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_spark_sql_session_deferred
from lib.query.HIVE import VISITS
from lib.query.HIVE import CAMPAIGN_DAILY
from ..base import AdminReportingBaseHandler

JOIN = {
}

QUERY_OPTIONS = {
    "default": VISITS,
    "campaign": CAMPAIGN_DAILY
}

OPTIONS = {
    "default": {
        "meta": {
            "groups": ["advertiser", "campaign_name", "campaign"],
            "fields": [
                "spent", 
                "num_served", 
                "num_loaded",
                "num_visible", 
                "num_visits", 
                "num_clicks", 
                "num_conv"
            ],
            "query": "campaign",
            "formatters": {
                "campaign": "none",
                "spent": "cpm"
                }
        },
    },

    "advertiser": {
        "meta": {
            "groups": ["campaign", "campaign_name"],
            "fields": ["spent", "num_served", "num_visits"],
            "query": "campaign",
            "formatters": {
                "campaign": "none",
                "spent": "cpm"
                }
        },
    },

    "campaign": {
        "meta": {
            "groups": [
                "uid", 
                "visit_time", 
                "visit_url", 
                "seller", 
                "tag", 
                "venue", 
                "creative_id", 
                "served_url",
                "price",
                "ecp"
                ],
            "fields": [],
            "formatters": {
                "campaign": "none",
                "spent": "cpm",
                "tag": "none",
                "venue": "none",
                "auction_id": "none"
                }
        }
    },
    
    "none": {
        "meta": {
            "groups": [],
            "fields": ["num_visits"],
            "formatters": {
                "campaign": "none",
                "spent": "cpm",
                "tag": "none",
                "venue": "none",
                "auction_id": "none"
                }
            }
        }
}

GROUPS = {
    "campaign": "campaign",
    "campaign_name": "campaign_name",
    "advertiser": "advertiser",
    "uid": "uid",
    "auction_id": "auction_id",
    "venue": "venue",
    "tag": "tag",
    "seller": "seller",
    "price": "price",
    "ecp": "ecp",
    "creative_id": "creative_id",
    "height": "height",
    "width": "width",
    "hour": "hour",
    "ip": "ip",
    "visit_time": "visit_time",
    "served_time": "from_unixtime(CAST(served_time AS BIGINT), 'yyyy-MM-dd HH:mm:ss')",
    "served_url": "served_url",
    "visit_url": "visit_url",
    "visit_segment": "visit_segment",
    "served_domain": "lower(regexp_replace(parse_url(concat('http://', regexp_replace(served_url, 'http://|https://', '')), 'HOST'), 'www.', ''))"
    }


FIELDS = {
    "spent": "ROUND(sum(spent) / 1000, 2)",
    "num_clicks": "sum(num_clicks)",
    "num_conv": "sum(num_conv)",
    "num_loaded": "sum(num_loaded)",
    "num_visible": "sum(num_visible)",
    "num_visits": "sum(num_visits)",
    "num_served": "sum(num_served)",
    "visit_rate": "CASE WHEN sum(num_visits)=0 THEN 0.0 ELSE round(sum(num_visits) / sum(num_served), 6) END",
    "ctr": "CASE WHEN sum(num_clicks)=0 THEN 0.0 ELSE round(sum(num_clicks) / sum(num_served), 6) END",
    "conv_rate": "CASE WHEN sum(num_conv)=0 THEN 0.0 ELSE round(sum(num_conv) / sum(num_served), 6) END",
    "percent_visible": "CASE WHEN sum(num_visible)=0 THEN 0.0 ELSE round(sum(num_visible) / sum(num_loaded), 2) END",
    "percent_loaded": "CASE WHEN sum(num_loaded)=0 THEN 0.0 ELSE round(sum(num_loaded) / sum(num_served), 2) END"
    }

WHERE = {
    "advertiser": "advertiser = '%(advertiser)s'",
    "campaign_name": "campaign_name like '%%%(campaign_name)s%%'",
    "source": "source = '%(source)s'",
    "served_domain": "lower(regexp_replace(parse_url(concat('http://', regexp_replace(url, 'http://|https://', '')), 'HOST'), 'www.', '')) rlike lower('.*(%(served_url)s).*')",
    "served_url": "lower(served_url) rlike lower('.*(%(served_url)s).*')",
    "visit_url": "lower(visit_url) rlike lower('.*(%(visit_url)s).*')",
    "category": "lower(category) like lower('%%%(category)s%%')",
    "campaign": "campaign = '%(campaign)s'",
    "tag": "tag = '%(tag)s'",
    "seller": "seller = '%(seller)s'",
    "creative_id": "creative_id = '%(creative_id)s'",
    "hour": "hour = '%(hour)s'",
    "auction_id": "auction_id = '%(auction_id)s'",
    "width": "width = '%(width)s'",
    "height": "height = '%(height)s'",
    "uid": "uid = '%(uid)s'"
    }

HAVING = {
    "min_imps": "num_imps >= %(min_imps)s",
    "min_served": "num_served >= %(min_served)s",
    "min_visible": "num_visible >= %(min_visible)s",
    "min_spent": "spent >= %(min_spent)s"
}

class VisitsHandler(AdminReportingBaseHandler):

    QUERY = VISITS
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS
    HAVING = HAVING

    OPTIONS = OPTIONS
    QUERY_OPTIONS = QUERY_OPTIONS

    def initialize(self, db=None, api=None, hive=None, spark_sql=None):
        self.db = db 
        self.api = api
        self.hive = hive
        self.spark_sql = spark_sql

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("admin/reporting/timeseries.html",data=o)

        yield default, (data,)

    @defer.inlineCallbacks
    def get_data(self,query,groupby=False,wide=False):

        query_list = [
            "SET spark.sql.shuffle.partitions=50",
            query
        ]

        raw = yield run_spark_sql_session_deferred(self.spark_sql,query_list)

        formatted = self.format_data(
            pandas.DataFrame(raw).fillna(value="NA"),
            groupby,
            wide
        )

        self.get_content(formatted)

    def format_data(self, u, groupby, wide):
        u = u.fillna("NA")

        if groupby and wide:
            u = u.set_index(groupby).sort_index()
            u = u.stack().unstack(wide)

            new_index = [i if i else "" for i in u.index.names]
            u.index.rename(new_index,inplace=True)
            u = u.reset_index().reset_index()
            u.rename(columns={"index":"__index__"},inplace=True)

        return u

        
    def get_meta_group(self,default="default"):
        meta = self.get_argument("meta", False)
        advertiser = self.get_argument("advertiser", False)
        campaign = self.get_argument("campaign", False)
        campaign_name = self.get_argument("campaign_name", False)
        
        if meta:
            return meta

        if campaign or campaign_name:
            return "campaign"

        if advertiser:
            return "advertiser"

        return default

    @tornado.web.asynchronous
    @decorators.meta_enabled
    @decorators.help_enabled
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include","").split(",")
        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)
        fields = self.get_argument("fields","").split(",")
        has_fields = len(fields) > 0 and len(fields[0]) > 0

        if has_fields:
            meta_data['fields'] = fields

        if formatted:
            params = self.make_params(
                meta_data.get("groups",[]),
                meta_data.get("fields",[]),
                self.make_where(),
                joins = self.make_join(meta_data.get("static_joins","")),
                having = self.make_having()
            )

            # Get the query string based on the query specified in the metadata
            # If there is no query specified, use the default query
            query = QUERY_OPTIONS[meta_data.get("query", "default")]

            self.get_data(
                self.make_query(params, query),
                meta_data.get("groups",[]),
                self.get_argument("wide",False)
            )

        else:
            self.get_content(pandas.DataFrame())
