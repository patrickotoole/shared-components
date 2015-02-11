import pandas
import tornado.web
import ujson

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_spark_sql_session_deferred
from lib.query.HIVE import HOVERBOARD
from ..base import AdminReportingBaseHandler

JOIN = {
    "category": "v JOIN domain_category t on lower(regexp_replace(parse_url(concat('http://', regexp_replace(reflect('java.net.URLDecoder', 'decode',v.bid_request.bid_info.url), 'http://|https://', '')), 'HOST'), 'www.', '')) = t.domain"
}

QUERY_OPTIONS = {
    "default": HOVERBOARD
}

OPTIONS = {
    "default": {
        "meta": {
            "groups": ["advertiser"],
            "fields": ["num_imps", "num_users"]
            },
        "formatters": {
            "uid": "none",
            "auction_id": "none"
            }
        },

    "advertiser": {
        "meta": {
            "groups": ["advertiser", "conversion_ids"],
            "fields": ["num_imps", "num_users"]
            },
        "formatters": {
            "uid": "none",
            "auction_id": "none"
            }
        },

    "none": {
        "meta": {
            "groups": [],
            "fields": ["num_imps", "num_users"]
            },
        "formatters": {
            "uid": "none",
            "auction_id": "none"
            }
        },

    "category": {
        "meta":{
            "groups": ["category"],
            "fields": ["num_imps", "num_users"],
            "static_joins": JOIN["category"]
        }
    },

    "full": {
        "meta": {
            "groups": [
                "advertiser",
                "date",
                "hour",
                "timestamp",
                "city",
                "state",
                "country",
                "ip_address",
                "user_agent",
                "url",
                "seller",
                "time_zone",
                "uid",
                "conversion_ids"
                ],
            "fields": ["num_imps", "num_users"]
            },
        "formatters": {
            "uid": "none",
            "auction_id": "none"
            }
        }
}

GROUPS = {
    "advertiser": "source",
    "date": "date",
    "hour": "hour(bid_request.timestamp)",
    "timestamp": "bid_request.timestamp",
    "city": "bid_request.bid_info.city",
    "state": "bid_request.bid_info.region",
    "country": "bid_request.bid_info.country",
    "ip_address": "bid_request.bid_info.ip_address",
    "user_agent": "bid_request.bid_info.user_agent",
    "url": "bid_request.bid_info.url",
    "domain": "lower(regexp_replace(parse_url(concat('http://', regexp_replace(reflect('java.net.URLDecoder', 'decode',bid_request.bid_info.url), 'http://|https://', '')), 'HOST'), 'www.', ''))",
    "seller": "bid_request.bid_info.selling_member_id",
    "time_zone": "bid_request.bid_info.time_zone",
    "uid": "bid_request.bid_info.user_id_64",
    "conversion_ids": "conversion_ids",
    "category": "t.category_name"
    }


FIELDS = {
    "num_imps": "count(*)",
    "num_users": "count(distinct bid_request.bid_info.user_id_64)",
    "urls": "collect_set(bid_request.bid_info.url)",
    "domains": "collect_set(lower(regexp_replace(parse_url(concat('http://', regexp_replace(reflect('java.net.URLDecoder', 'decode',bid_request.bid_info.url), 'http://|https://', '')), 'HOST'), 'www.', '')))"
    }

WHERE = {
    "advertiser": "source = '%(advertiser)s'",
    "conversion_id": "array_contains(conversion_ids, '%(conversion_id)s')",
    "domain": "lower(regexp_replace(parse_url(concat('http://', regexp_replace(reflect('java.net.URLDecoder', 'decode',bid_request.bid_info.url), 'http://|https://', '')), 'HOST'), 'www.', '')) like lower('%%%(domain)s%%')",
    "url": "lower(reflect('java.net.URLDecoder', 'decode',bid_request.bid_info.url)) like lower('%%%(url)s%%')",
    "category": "lower(category_name) like lower('%%%(category)s%%')"
    }

HAVING = {
    "min_imps": "num_imps >= %(min_imps)s",
    "min_users": "num_users >= %(min_users)s"
}
class HoverboardHandler(AdminReportingBaseHandler):

    QUERY = HOVERBOARD
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
            self.render("admin/reporting/target_list.html",data=o)

        yield default, (data,)

    @defer.inlineCallbacks
    def get_data(self,query,groupby=False,wide=False):

        query_list = [
            "add jar lib_managed/jars/serdes/json-serde-1.1.9.3-SNAPSHOT-jar-with-dependencies.jar",
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
        category = self.get_argument("category", False)
        includes = self.get_argument("include", False)

        if meta:
            return meta

        if includes and "category" in includes:
            return "category"

        if category:
            return "category"
        
        if advertiser:
            return "advertiser"

        return default

    @tornado.web.asynchronous
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include","").split(",")
        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)

        fields = self.get_argument("fields","").split(",")
        has_fields = len(fields) > 0 and len(fields[0]) > 0

        if has_fields:
            meta_data['fields'] = fields

        if meta:
            self.write(ujson.dumps(meta_data))
            self.finish()

        elif formatted:
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
