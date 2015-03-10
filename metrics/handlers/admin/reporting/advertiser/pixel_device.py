import tornado.web
import ujson
import pandas
import datetime

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_spark_sql_session_deferred
from lib.query.HIVE import PIXEL_DEVICE
import lib.query.helpers as query_helpers
from ..base import AdminReportingBaseHandler

OPTIONS = {
    "default": {
        "meta": {
            "groups" : ["advertiser", "os", "browser", "device"],
            "fields" : ["views", "users"]
        }
    },

    "none": {
        "meta": {
            "groups" : [],
            "fields" : ["views", "users"]
         }
    }
}

GROUPS = {
    "advertiser": "advertiser",
    "browser": "browser",
    "device": "device",
    "os": "os"
}

FIELDS = {
    "views": "sum(num_views)",
    "users": "sum(num_users)"
}

WHERE = {
    "advertiser": "advertiser = '%(advertiser)s'",
    "browser": "browser = '%(browser)s'",
    "os": "os = '%(os)s'"
}

class AdvertiserPixelDeviceHandler(AdminReportingBaseHandler):
    QUERY = PIXEL_DEVICE
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS

    OPTIONS = OPTIONS

    def initialize(self, db=None, hive=None, spark_sql=None, **kwargs):
        self.db = db
        self.hive = hive
        self.spark_sql = spark_sql

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            if "domain" in data.columns:
                data = self.reformat_domain_data(data)

            o = Convert.df_to_json(data)
            self.render("admin/reporting/target_list.html",data=o)

        yield default, (data,)

    def format_data(self,u,groupby,wide):
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

    def get_meta_group(self,default="default"):

        meta = self.get_argument("meta",False)

        if meta:
            return meta

        return default

    @tornado.web.asynchronous
    @decorators.help_enabled
    @decorators.meta_enabled
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include","").split(",")
        wide = self.get_argument("wide",False)

        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)
        meta_data["is_wide"] = wide

        if formatted:
            params = self.make_params(
                meta_data.get("groups",[]),
                meta_data.get("fields",[]),
                self.make_where(),
                self.make_join(meta_data.get("static_joins",""))
            )

            self.get_data(
                self.make_query(params),
                meta_data.get("groups",[]),
                wide
            )

        else:
            self.get_content(pandas.DataFrame())
