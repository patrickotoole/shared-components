import pandas
import tornado.web
import ujson

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred
from lib.query.HIVE import DOMAIN_AVAILS
from ..base import AdminReportingBaseHandler

JOIN = {
    "type":"v JOIN (select distinct log as log, pattern as pattern, action as action from domain_list where log like '%%%(type)s%%') d on d.pattern = v.domain",
    "static_type": "v JOIN domain_list d on d.pattern = v.domain"
}

OPTIONS = {
    "default": {
        "meta": {
            "groups" : ["domain"],
            "fields" : ["num_auctions"]
        }
    },
    "type": {
        "meta": {
            "groups" : ["type","domain"],
            "fields" : ["num_auctions"],
            "static_joins" : JOIN["static_type"]
        },

    }
}

GROUPS = {
    "domain": "domain",
    "seller": "seller",
    "date": "date",
    "action":"d.action",
    "type":"d.log"
}

FIELDS = {
    "num_auctions": "sum(num_auctions)"
}

WHERE = {
    "domain": "domain like '%%%(domain)s%%'",
    "action": "d.action = '%(action)s'",
    "type" : "d.log like '%%%(type)s%%'"
}


class DomainHandler(AdminReportingBaseHandler):

    QUERY = DOMAIN_AVAILS
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS
    JOINS = JOIN

    OPTIONS = OPTIONS

    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive

    @classmethod
    def reformat_domain_data(self,data):
        def split_help(x):
            s = x.replace(" ","").split(".")
            if len(s[-1]) > 2 and len(s[0]) < 5:
                return ".".join(s[-2:])
            else:
                return ".".join(s[-3:])

        data["domain"] = data.domain.map(lambda x: split_help(x))
        data["domain"] = data.domain.map(lambda x: x.replace("$","").replace("]",""))
        data['num_auctions'] = data['num_auctions'].map(int)
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

    @decorators.formattable
    def get_timeseries(self,data):

        def default(self,data):
            if "domain" in data.columns:
                data = self.reformat_domain_data(data)

            o = Convert.df_to_json(data)
            self.render("admin/reporting/timeseries.html",data=o)

        yield default, (data,)

    def format_data(self,u,groupby,wide):
        if "domain" in u.columns:
            u = self.reformat_domain_data(u)

        if groupby and wide == "timeseries":
            group_cols = [ i for i in groupby if i != "date"]
            val_cols = [ i for i in u.columns if i not in group_cols]
            

            u = u.groupby(group_cols).apply(lambda x: x[val_cols].T.to_dict().values())
            u = u.reset_index()
            u.rename(columns={0:"timeseries"},inplace=True)

        elif groupby and wide:
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
            "set shark.map.tasks=44", 
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

    def get_meta_group(self,default="default"):
        category = self.get_argument("category", False)
        meta = self.get_argument("meta",False)

        if meta:
            return meta
        
        if category:
            return "category"

        return default

    @tornado.web.asynchronous
    def get(self,arg1=False,arg2=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include","").split(",")
        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)


        if arg1 == "meta" or arg2 == "meta":
            self.write(ujson.dumps(meta_data))
            self.finish()

        elif formatted:
            params = self.make_params(
                meta_data.get("groups",[]),
                meta_data.get("fields",[]),
                self.make_where(),
                self.make_join(meta_data.get("static_joins",""))
            )
            print params
            self.get_data(
                self.make_query(params),
                meta_data.get("groups",[]),
                self.get_argument("wide",False)
            )

        elif arg1 == "timeseries":
            self.get_timeseries(pandas.DataFrame())

        else:
            self.get_content(pandas.DataFrame())
