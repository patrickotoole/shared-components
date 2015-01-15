import pandas
import tornado.web
import ujson

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_spark_sql_session_deferred
from lib.query.HIVE import CLICK_IMPS_QUERY
from ..base import AdminReportingBaseHandler

OPTIONS = {
    "default": {
        "meta": {
            "groups": ["advertiser", "campaign"],
            "fields": ["num_clicked"],
            "formatters": {
                "campaign": "none"
                }
            },
        },

    "advertiser": {
        "meta": {
            "groups": ["campaign", "creative", "height", "width"],
            "fields": ["num_clicked"],
            "formatters": {
                "campaign": "none",
                "creative": "none"                
                }
            }
        },

    "full": {
        "meta": {
            "groups": [
                "advertiser", 
                "campaign", 
                "date",
                "hour",
                "uid",
                "serv_date",
                "serv_hour",
                "domain",
                "seller",
                "tag",
                "venue",
                "campaign",
                "clicked",
                "ip",
                "auction_id",
                "height",
                "width",
                "price",
                "ecp",
                "creative"
             ],
            "fields": ["num_clicked", "num_served"],
            "formatters": {
                "campaign": "campaign",
                "seller": "seller",
                "tag": "tag",
                "venue": "venue",
                "auction_id": "none",
                "uid": "none",
                "height": "none",
                "width": "none",
                "creative": "none"
            }
        }
    },

    "none" : {
        "meta": {
            "groups": [],
            "fields": ["num_clicked"],
            "formatters": {
                "uid": "none",
                "campaign": "campaign",
                "seller": "seller",
                "tag": "tag",
                "venue": "venue",
                "auction_id": "none",
                "uid": "none",
                "height": "none",
                "width": "none",
                "creative": "none"
                }
            }
        }
 }

GROUPS = {
    "advertiser": "advertiser",
    "date": "date",
    "hour": "hour",
    "serv_date": "serv_date",
    "serv_hour": "serv_hour",
    "uid": "uid",
    "domain": "domain",
    "seller": "seller",
    "tag": "tag",
    "venue": "venue",
    "clicked": "clicked",
    "campaign": "campaign",
    "ip": "ip",
    "auction_id": "auction_id",
    "height": "height",
    "width": "width",
    "price": "price",
    "ecp": "ecp",
    "creative": "creative"
    }

FIELDS = {
    "num_served": "count(distinct auction_id)",
    "num_clicked": "count(distinct CASE WHEN clicked THEN auction_id ELSE NULL END)"
    }

WHERE = {
    "domain": "domain like '%%%(domain)s%%'",
    "advertiser": "advertiser = '%(advertiser)s'",
    "campaign": "campaign = '%(campaign)s'",
    "uid": "uid = '%(uid)s'",
    "ip": "ip = '%(ip)s'",
    "seller": "seller = '%(seller)s'",
    "venue": "venue = '%(venue)s'",
    "tag": "tag = '%(tag)s'",
    "creative": "creative = '%(creative)s'",
    "height": "height = '%(height)s'",
    "width": "width = '%(width)s'",
    "clicked": "CASE WHEN lower('%(clicked)s') = 'true' THEN clicked ELSE NOT CLICKED END"
    }

class ClickImpsHandler(AdminReportingBaseHandler):

    QUERY = CLICK_IMPS_QUERY
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS

    OPTIONS = OPTIONS

    def initialize(self, db=None, api=None, hive=None, spark_sql=None):
        self.db = db 
        self.api = api
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
            "SET spark.sql.shuffle.partitions=3",
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
        advertiser = self.get_argument("advertiser",False)
        campaign = self.get_argument("campaign", False)
        uid = self.get_argument("uid", False)
        meta = self.get_argument("meta",False)

        if meta:
            return meta

        if uid:
            return "imps"
        if campaign:
            return "imps"
        elif advertiser:
            return "advertiser"
        else:
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
