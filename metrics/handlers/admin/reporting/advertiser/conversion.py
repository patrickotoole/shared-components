import pandas
import tornado.web
import ujson

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred, run_spark_sql_session_deferred, run_spark_sql_deferred
from lib.query.HIVE import CONVERSION_QUERY, CENSUS_CONVERSION_QUERY
from ..base import AdminReportingBaseHandler

JOIN = {
    "experiment": "v JOIN experiment_test_ref t on v.first_campaign = t.campaign_id",
    "bucket": "v JOIN (SELECT bucket_name, campaign_id FROM campaign_bucket_ref WHERE campaign_id IS NOT NULL) t on v.first_campaign = t.campaign_id",
    "lateral_view_imps": " LATERAL VIEW explode(domains) a as domain, imps",
    "lateral_view_clicks": " LATERAL VIEW explode(domains) as as domain, num_clicks",
    "campaign_view": " LATERAL VIEW explode(campaigns) a as campaign, imps",
    "census_income": "v JOIN (SELECT * FROM zip_code_ref WHERE median_household_income IS NOT NULL and zip_code IS NOT NULL) b ON (v.zip_code = b.zip_code)",
    "census_age_gender": "v RIGHT OUTER JOIN (SELECT zip_code, gender, max_age, min_age, number, percent FROM census_age_gender GROUP BY zip_code, gender, min_age, max_age, number, percent) b ON (v.zip_code = b.zip_code)",
    "census_race": " v RIGHT OUTER JOIN (SELECT zip_code, race, sum(number) as number, sum(percent) as percent FROM census_race GROUP BY zip_code, race ) b ON (v.zip_code = b.zip_code)"
}

QUERY_OPTIONS = {
    "default": CONVERSION_QUERY,
    "census": CENSUS_CONVERSION_QUERY
}

OPTIONS = {
    "default": {
        "meta": {
            "groups": ["advertiser", "segment", "attributed_to"],
            "fields": ["num_conv"],
            "formatters": {
                "segment": "none",
                "order_type": "none",
                "order_id": "none",
                "conv_id": "none",
                "uid": "none"
                }
            }
        },

    "census_income": {
        "meta": {
            "groups": ["advertiser", "date"],
            "query": "census",
            "fields": ["median_household_income"],
            "static_joins": JOIN["census_income"],
            "formatters": {
                "zip": "none"
            }
        }
    },

    "census_age_gender": {
        "meta": {
            "groups": ["advertiser", "date", "gender", "min_age", "max_age"],
            "query": "census",
            "fields": ["population", "converted_population"],
            "static_joins": JOIN["census_age_gender"],
            "formatters": {
                "zip": "none"
            }
        }
    },

    "census_race": {
        "meta": {
            "groups": ["advertiser", "date", "race"],
            "query": "census",
            "fields": ["population", "converted_population"],
            "static_joins": JOIN["census_race"],
            "formatters": {
                "zip": "none"
            }
        }
    },

    "first_campaign": {
        "meta": {
            "groups": ["advertiser", "first_campaign", "segment"],
            "fields": ["num_conv"],
            "formatters": {
                "first_campaign": "none",
                "segment": "none",
                "campaigns": "none",
                "order_type": "none",
                "order_id": "none",
                "conv_id": "none",
                "uid": "none"                
            }
        }
    },

    "campaign": {
        "meta": {
            "groups": ["advertiser", "segment", "campaigns"],
            "fields": ["num_conv"],
            "formatters": {
                "segment": "none",
                "campaigns": "none",
                "order_type": "none",
                "order_id": "none",
                "conv_id": "none",
                "uid": "none"                
            }
        }
    },

    "experiment" : {
        "meta": {
            "groups" : ["experiment", "is_control"],
            "fields" : ["num_conv"],
            "static_joins" : JOIN["experiment"]
        }
    },

    "experiment_groups" : {
        "meta": {
            "groups" : ["experiment", "group_name", "is_control"],
            "fields" : ["num_conv"],
            "static_joins" : JOIN["experiment"]
        }
    },

    "bucket" : {
        "meta": {
            "groups" : ["advertiser", "bucket_name", "campaign_id"],
            "fields" : ["num_conv"],
            "static_joins" : JOIN["bucket"]
        }
    },

    "advertiser": {
        "meta": {
            "groups": ["segment", "attributed_to"],
            "fields": ["num_conv"],
            "formatters": {
                "segment": "none",
                "order_type": "none",
                "order_id": "none",
                "conv_id": "none",
                "uid": "none"
                }
            }
        },

    "segment": {
        "meta": {
            "groups": [
                "date", 
                "hour", 
                "conv_timestamp_utc", 
                "uid", 
                "segment", 
                "conv_id", 
                "order_id", 
                "order_type", 
                "since_last_served", 
                "since_first_served"
                ],
            "fields": ["num_served"],
            "formatters": {
                "segment": "none",
                "order_type": "none",
                "order_id": "none",
                "conv_id": "none",
                "uid": "none"
                }
            }
        },
    "top_campaigns": {
        "meta": {
            "groups": ["advertiser", "campaign"],
            "fields": ["imps", "num_conv"],
            "static_joins": JOIN["campaign_view"],
            "formatters" : {
                "campaign": "none"    
            }
        }
    },
    "top_domains_imps": {
        "meta": {
            "groups": ["advertiser", "domain"],
            "fields": ["imps", "num_conv"],
            "static_joins": JOIN["lateral_view_imps"]
        }
    },

    "top_domains_clicks": {
        "meta": {
            "groups": ["advertiser", "domain"],
            "fields": ["num_clicks", "num_conv"],
            "static_joins": JOIN["lateral_view_clicks"]
        }
    },

    "geo": {
        "meta": {
            "groups": ["advertiser", "city", "state"],
            "fields": ["num_conv", "clicks", "num_served"]
            }
    },

    "device": {
        "meta": {
            "groups": ["advertiser", "browser", "os", "device"],
            "fields": ["num_conv", "clicks", "num_served"]
            }
    },

    "full": {
        "meta": {
            "groups": [
                "advertiser",
                "date",
                "hour",
                "conv_timestamp_utc",
                "uid",
                "segment",
                "query_str",
                "conv_id",
                "order_id",
                "order_type",
                "since_last_served",
                "since_first_served",
                "attributed_to",
                "domains",
                "click_domains",
                "campaigns",
                "click_campaigns",
                "first_campaign",
                "last_campaign",
                "influencer_campaign"
                       ],
            "fields": ["num_conv", "num_served"]
        }
    },
    "none": {
        "meta": {
            "groups": [],
            "fields": ["num_conv", "num_served"],
            "formatters": {
                "segment": "none",
                "order_type": "none",
                "order_id": "none",
                "conv_id": "none",
                "uid": "none"
                } 
        }
    }
}

GROUPS = {
    "advertiser": "advertiser",
    "date": "date",
    "hour": "hour",
    "conv_timestamp_utc": "conv_timestamp_utc",
    "uid": "uid",
    "city": "city",
    "state": "state",
    "country": "country",
    "timezone": "timezone",
    "coordinates": "coordinates",
    "dma": "dma",
    "zip_code": "zip_code",
    "browser": "browser",
    "device": "device",
    "os": "os",
    "ip": "ip",
    "segment": "segment",
    "query_str": "query_str",
    "conv_id": "conv_id",
    "order_id": "order_id",
    "order_type": "order_type",
    "since_last_served": "since_last_served",
    "since_first_served": "since_first_served",
    "attributed_to": "CASE WHEN num_served > 0 THEN 'Rockerbox' ELSE 'Other' END",
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
    "click_domains": "click_domains",
    "zip": "v.zip_code",
    "median_household_income": "round(sum(b.median_household_income * num_conv) / sum(num_conv), 0)"
    }


FIELDS = {
    "num_served": "sum(num_served)",
    "imps": "sum(imps)",
    "clicks": "sum(num_clicked)",
    "num_clicks": "sum(num_clicks)",
    "num_conv": "count (*)",
    "converted_population": "sum(CASE WHEN v.zip_code IS NOT NULL THEN (num_conv*(percent / 100.0)) ELSE 0.0 END)", 
    "population": "sum(number)"
    }

WHERE = {
    "advertiser": "advertiser = '%(advertiser)s'",
    "uid": "uid = '%(uid)s'",
    "order_id": "order_id = '%(order_id)s'",
    "order_type": "order_type = '%(order_type)s'",
    "segment": "segment = '%(segment)s'",
    "conv_id": "conv_id = '%(conv_id)s'",
    "is_rockerbox": "CASE WHEN lower('%(is_rockerbox)s') = 'true' THEN num_served > 0 ELSE num_served = 0 END",
    "attributed_to": "CASE WHEN '%(attributed_to)s' LIKE 'Rockerbox' THEN num_served > 0 ELSE num_served < 0 END",
    "experiment": "num_served > 0 AND t.experiment_id = '%(experiment)s'",
    "campaign": "array_contains(map_keys(campaigns), '%(campaign)s')",
    "since_last_served": "since_last_served <= '%(since_last_served)s'",
    "post_click": "CASE WHEN lower('%(post_click)s') = 'true' THEN num_clicked > 0 END"
    }

class ConversionCheckHandler(AdminReportingBaseHandler):

    QUERY = CONVERSION_QUERY
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS

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
        meta = self.get_argument("meta", False)
        advertiser = self.get_argument("advertiser", False)
        segment = self.get_argument("segment", False)
        campaign = self.get_argument("campaign", False)

        if meta:
            return meta

        if campaign:
            return "campaign"

        if segment:
            return "segment"
        
        if advertiser:
            return "advertiser"

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
