import pandas
import tornado.web
import ujson

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred
from lib.query.HIVE import CONVERSION_QUERY
from ..base import AdminReportingBaseHandler

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
                "conv_timestamp", 
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
        }
    }

GROUPS = {
    "advertiser": "advertiser",
    "date": "date",
    "hour": "hour",
    "conv_timestamp": "conv_timestamp",
    "uid": "uid",
    "segment": "segment",
    "query_str": "query_str",
    "conv_id": "conv_id",
    "order_id": "order_id",
    "order_type": "order_type",
    "since_last_served": "since_last_served",
    "since_first_served": "since_first_served",
    "attributed_to": "CASE WHEN num_served > 0 THEN 'Rockerbox' ELSE 'Other' END"
    }

FIELDS = {
    "num_conv" : "count(*)",
    "num_served": "sum(num_served)"
    }

WHERE = {
    "advertiser": "advertiser = '%(advertiser)s'",
    "uid": "uid = '%(uid)s'",
    "order_id": "order_id = '%(order_id)s'",
    "order_type": "order_type = '%(order_type)s'",
    "segment": "segment = '%(segment)s'",
    "conv_id": "conv_id = '%(conv_id)s'",
    "is_rockerbox": "CASE WHEN lower('%(is_rockerbox)s') = 'true' THEN num_served > 0 ELSE num_served = 0 END",
    "attributed_to": "CASE WHEN '%(attributed_to)s' LIKE 'Rockerbox' THEN num_served > 0 ELSE num_served < 0 END"
    }

class ConversionCheckHandler(AdminReportingBaseHandler):

    QUERY = CONVERSION_QUERY
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
        advertiser = self.get_argument("advertiser", False)
        segment = self.get_argument("segment", False)
        
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
                self.make_where()
            )
            self.get_data(
                self.make_query(params),
                meta_data.get("groups",[]),
                self.get_argument("wide",False)
            )

        else:
            self.get_content(pandas.DataFrame())

 