import pandas
import tornado.web
import ujson

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_spark_sql_session_deferred
from lib.query.HIVE import AGG_APPROVED_AUCTIONS
from ..base import AdminReportingBaseHandler

OPTIONS = {
    "default": {
        "meta": {
            "groups" : ["advertiser","type"],
            "fields" : ["num_auctions","domain_count"]
        }
    },
    "advertiser": {
        "meta": {
            "groups": ["type", "domain"],
            "fields" : ["num_auctions"]
        }
    },
    "type": {
        "meta": {
            "groups": ["domain"],
            "fields": ["num_auctions"]
        }
    }
}

GROUPS = {
    "advertiser" : "SPLIT(type,'_')[0]",
    "type" : "type",
    "domain" : "domain",
    "state" : "state",
    "city" : "city"
}

FIELDS = {
    "domain_count" : "count(distinct domain)",
    "num_auctions" : "sum(num_auctions)"
}

WHERE = {
    "advertiser" : "type like '%%%(advertiser)s%%'",
    "type" : "type like '%%%(type)s%%'",
    "type_equal" : "type = '%(type_equal)s'", 
    "domain" : "domain like '%%%(domain)s%%'",
    "state" : "state = '%(state)s'",
    "city" : "city = '%(city)s'"
}    

class DomainListHandler(AdminReportingBaseHandler):

    QUERY = AGG_APPROVED_AUCTIONS
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS

    OPTIONS = OPTIONS


    def initialize(self, db=None, api=None, hive=None, spark_sql=None):
        self.db = db 
        self.api = api
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
        data = data.groupby([c for c in data.columns if c != "num_auctions"]).sum()
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
        u["num_auctions"] = u.num_auctions.astype(int)


        if "domain_count" in u.columns:
            u["domain_count"] = u.domain_count.astype(int)

        if "domain" in u.columns:
            u = self.reformat_domain_data(u)

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

        if advertiser:
            return "advertiser"
        
        return default

    

    @tornado.web.asynchronous
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include",False)
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


