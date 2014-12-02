import pandas
import tornado.web
import ujson

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred
from lib.query.HIVE import CLICK_QUERY
from ..base import AdminReportingBaseHandler

JOIN = {
    "experiment": "v JOIN experiment_test_ref t on v.first_campaign = t.campaign_id",
    "bucket": "v JOIN (SELECT bucket_name, campaign_id FROM campaign_bucket_ref WHERE campaign_id IS NOT NULL) t on v.first_campaign = t.campaign_id",
    "lateral_view_imps": " LATERAL VIEW explode(domains) a as domain, imps",
    "lateral_view_clicks": " LATERAL VIEW explode(click_domains) as as domain, clicks",
    "campaign_view": " LATERAL VIEW explode(campaigns) a as campaign, imps" 
}

OPTIONS = {
    "default": {
        "meta": {
            "groups": ["advertiser", "last_campaign"],
            "fields": ["num_clicked"],
            "formatters": {
                "uid": "none",
                "last_campaign": "none"
                }
            }
        },

    "campaign": {
        "meta": {
            "groups": ["date", "uid", "click_domains", "click_campaigns"],
            "fields": ["num_clicked"],
            "formatters": {
                "campaigns": "none",
                "uid": "none"                
            }
        }
    },

    "experiment" : {
        "meta": {
            "groups" : ["experiment", "is_control"],
            "fields" : ["num_clicked"],
            "static_joins" : JOIN["experiment"]
        }
    },

    "experiment_groups" : {
        "meta": {
            "groups" : ["experiment", "group_name", "is_control"],
            "fields" : ["num_clicked"],
            "static_joins" : JOIN["experiment"]
        }
    },

    "bucket" : {
        "meta": {
            "groups" : ["advertiser", "bucket_name", "campaign_id"],
            "fields" : ["num_clicked"],
            "static_joins" : JOIN["bucket"]
        }
    },

    "advertiser": {
        "meta": {
            "groups": ["last_campaign"],
            "fields": ["num_clicked"],
            "formatters": {
                "uid": "none",
                "last_campaign": "none"
                }
            }
        },

    "top_domains_imps": {
        "meta": {
            "groups": ["advertiser", "domain"],
            "fields": ["imps", "clicks"],
            "static_joins": JOIN["lateral_view_imps"]
        }
    },

    "top_domains_clicks": {
        "meta": {
            "groups": ["advertiser", "domain"],
            "fields": ["clicks"],
            "static_joins": JOIN["lateral_view_clicks"]
        }
    },

    "geo": {
        "meta": {
            "groups": ["advertiser", "city", "state"],
            "fields": ["num_clicked"]
            }
    },

    "full": {
        "meta": {
            "groups": [
                "advertiser",
                "date",
                "hour",
                "uid",
                "city",
                "state",
                "country",
                "timezone",
                "coordinates",
                "dma",
                "zip_code",
                "ip",
                "since_last_served",
                "since_first_served",
                "sellers",
                "venues",
                "tags",
                "domains",
                "venues",
                "click_sellers",
                "click_venues",
                "click_tags",
                "click_domains",
                "campaigns",
                "click_campaigns",
                "first_campaign",
                "last_campaign",
                "influencer_campaign"
                       ],
            "fields": ["num_clicked", "num_served"]
        }
    },
    "none": {
        "meta": {
            "groups": [],
            "fields": ["num_clicked"],
            "formatters": {
                "uid": "none",
                "auction_id": "none",
                "last_campaign": "none",
                "first_campaign": "none",
                "influencer_campaign": "none"
                } 
        }
    }
}

GROUPS = {
    "advertiser": "advertiser",
    "date": "date",
    "hour": "hour",
    "uid": "uid",
    "city": "city",
    "state": "state",
    "country": "country",
    "timezone": "timezone",
    "coordinates": "coordinates",
    "dma": "dma",
    "zip_code": "zip_code",
    "ip": "ip",
    "since_last_served": "since_last_served",
    "since_first_served": "since_first_served",
    "bucket": "t.bucket_name",
    "experiment": "t.experiment_id",
    "domain": "domain",
    "domains": "domains",
    "sellers": "sellers",
    "tags": "tags",
    "venues": "venues",
    "campaigns": "campaigns",
    "click_campaigns": "click_campaigns",
    "first_campaign": "first_campaign",
    "last_campaign": "last_campaign",
    "influencer_campaign": "influencer_campaign",
    "click_sellers": "click_sellers",
    "click_tags": "click_tags",
    "click_venues": "click_venues",
    "click_domains": "click_domains"
    }


FIELDS = {
    "num_served": "sum(num_served)",
    "imps": "sum(imps)",
    "clicks": "sum(clicks)",
    "num_clicks": "sum(num_clicks)",
    "num_clicked": "sum(num_clicked)",
    "num_conv": "count (*)"
    }

WHERE = {
    "advertiser": "advertiser = '%(advertiser)s'",
    "uid": "uid = '%(uid)s'",
    "experiment": "t.experiment_id = '%(experiment)s'",
    "campaign": "array_contains(map_keys(click_campaigns), '%(campaign)s')",
    "since_last_served": "since_last_served <= '%(since_last_served)s'",
    "last_campaign": "last_campaign = '%(last_campaign)s'"
    }

class ClickCheckHandler(AdminReportingBaseHandler):

    QUERY = CLICK_QUERY
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS

    OPTIONS = OPTIONS

    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("admin/reporting/target_list.html",data=o)

        yield default, (data,)

    @defer.inlineCallbacks
    def get_data(self,query,groupby=False,wide=False):

        query_list = [
            "set shark.map.tasks=12", 
            "set mapred.reduce.tasks=0",
            query
        ]
        raw = yield run_hive_session_deferred(self.hive,query_list)

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
        meta = self.get_argument("meta", False)
        advertiser = self.get_argument("advertiser", False)
        segment = self.get_argument("segment", False)
        campaign = self.get_argument("campaign", False)
        last_campaign = self.get_argument("last_campaign", False)

        if meta:
            return meta

        if campaign:
            return "campaign"

        if segment:
            return "segment"
        
        if advertiser:
            return "advertiser"

        if last_campaign:
            return "campaign"

        return default

    @tornado.web.asynchronous
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include","").split(",")
        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)

        if meta:
            self.write(ujson.dumps(meta_data))
            self.finish()

        elif formatted:
            params = self.make_params(
                meta_data.get("groups",[]),
                meta_data.get("fields",[]),
                self.make_where(),
                self.make_join(meta_data.get("static_joins",""))
            )

            self.get_data(
                self.make_query(params),
                meta_data.get("groups",[]),
                self.get_argument("wide",False)
            )

        else:
            self.get_content(pandas.DataFrame())
