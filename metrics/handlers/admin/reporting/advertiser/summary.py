import tornado.web
import ujson
import pandas

from twisted.internet import defer 

from lib.helpers import *
from lib.query.MYSQL import *
import lib.query.helpers as query_helpers
from lib.hive.helpers import run_hive_session_deferred, run_spark_sql_session_deferred
from lib.query.HIVE import AGG_ADVERTISER_DOMAIN
from ..base import AdminReportingBaseHandler 

JOIN = {
    "type":"v JOIN (select distinct log as log, pattern as pattern, action as action from domain_list where log like '%%%(type)s%%') d on d.pattern = v.domain",
    "static_type": "v JOIN domain_list d on d.pattern = v.domain"
}

OPTIONS = {
    "default": {
        "meta": {
            "groups" : ["advertiser","domain"],
            "fields" : ["available","seen","served","visible","spent"],
            "formatters":{
                "spent":"cpm"
            }
        }
    },
    "type": {
        "meta": {
            "groups" : ["type"],
            "fields" : ["available","seen","served","visible","spent"],
            "formatters":{
                "spent":"cpm"
            },
            "static_joins" : JOIN["static_type"]
        }
    },
    "none": {
        "meta": {
            "groups" : [],
            "fields" : ["available","seen","served","visible","spent"],
            "formatters":{
                "spent":"cpm"
            }
        }
    }

}

FIELDS = {
    "available":"sum(num_avail)",
    "seen":"sum(num_seen)", 
    "served":"sum(num_served)", 
    "visible":"sum(num_visible)", 
    "spent":"sum(total_spent)"
}

GROUPS = {
    "advertiser":"advertiser",
    "domain":"domain",
    "date":"date",
    "type":"d.log",
    "action":"d.action"
}

WHERE = {
    "advertiser":"advertiser like '%%%(advertiser)s%%'",
    "domain": "domain like '%%%(domain)s%%'",
    "type":"d.log like '%%%(type)s%%'",
    "action":"d.action = '%(action)s'",
    "advertiser_equal":"advertiser = '%(advertiser_equal)s'"
}

class AdvertiserSummaryHandler(AdminReportingBaseHandler):

    QUERY = AGG_ADVERTISER_DOMAIN
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS
    JOINS = JOIN

    OPTIONS = OPTIONS
 

    def initialize(self, db=None, hive=None, spark_sql=None, **kwargs):
        self.db = db 
        self.hive = hive
        self.spark_sql = spark_sql

    @classmethod
    def reformat_domain_data(self,data):
        #helper
        def split_help(x):
            s = x.replace(" ","").split(".")
            if len(s[-1]) > 2:
                return ".".join(s[-2:])
            else:
                return ".".join(s[-3:])

        data["domain"] = data.domain.map(lambda x: split_help(x))
        data["domain"] = data.domain.map(lambda x: x.replace("$","").replace("]",""))
        data = data.groupby([c for c in data.columns if c != "served"]).sum()
        return data.reset_index()
        

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
            try:
                try:
                    u[field] = u[field].astype(int)
                except:
                    u[field] = u[field].astype(float) 
                if field == "spent":
                    u[field] = u[field]/1000
            except:
                pass

        if "domain_count" in u.columns:
            u["domain_count"] = u.domain_count.astype(int)

        # if "domain" in u.columns:
        #    u = self.reformat_domain_data(u)

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
        
        domain_list = self.get_argument("type",False)
        advertiser = self.get_argument("advertiser",False)
        meta = self.get_argument("meta",False)

        if meta:
            return meta

        if domain_list:
            return "type"

        return default

    @tornado.web.asynchronous
    @decorators.meta_enabled
    @decorators.help_enabled
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include","").split(",")
        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)

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
                self.get_argument("wide",False)
            )

        else:
            self.get_content(pandas.DataFrame())

 
