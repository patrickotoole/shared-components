import tornado.web
import ujson
import pandas
import datetime

from twisted.internet import defer 

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred, run_hive_deferred
from lib.query.HIVE import ADVERTISER_VIEWABLE
import lib.query.helpers as query_helpers
from ..base import AdminReportingBaseHandler 

OPTIONS = {
    "default": {
        "meta": {
            "groups" : ["advertiser","campaign"],
            "fields" : ["served","loaded","visible","spent"],
            "formatters" : {
                "campaign":"none",
                "spent": "cpm"
            }
        }
    },
    "tag": {
        "meta": {
            "groups" : ["seller","tag","domain"],
            "fields" : ["served","loaded","visible","spent"],
            "formatters" : {
                "campaign":"none",
                "spent": "cpm"
            }
        }
    } 
}

# s/\(.\{-}\) .*/    "\1":"\1",/g
GROUPS = {
    "advertiser":"advertiser",
    "date":"date",
    "campaign":"campaign",
    "seller":"seller",
    "tag":"tag",
    "venue":"venue",
    "domain":"domain",
    "creative":"creative",
    "width":"width",
    "height":"height"
}

FIELDS = {
    "spent":"sum(spent)",
    "total_ecp":"sum(total_ecp)",
    "served":"sum(num_served)",
    "loaded":"sum(num_loaded)",
    "visible":"sum(num_visible)",
    "num_visible_on_load":"sum(num_visible_on_load)",
    "num_long_visit":"sum(num_long_visit)"
}

WHERE = {
    "advertiser":"advertiser like '%%%(advertiser)s%%'",
    "campaign":"campaign = '%(campaign)s'"
}


class AdvertiserViewableHandler(AdminReportingBaseHandler):

    QUERY = ADVERTISER_VIEWABLE
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS

    OPTIONS = OPTIONS
 

    def initialize(self, db=None, hive=None, **kwargs):
        self.db = db 
        self.hive = hive

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
            if field in u.columns:
                try:
                    try:
                        u[field] = u[field].astype(int)
                    except:
                        u[field] = u[field].astype(float) 
                    if field == "spent":
                        u[field] = u[field]/1000
                except:
                    logging.warn("Could not format %s" % field)
                    pass

        if "domain_count" in u.columns:
            u["domain_count"] = u.domain_count.astype(int)

        if "domain" in u.columns:
            u = self.reformat_domain_data(u)

        if groupby and wide:
            print groupby
            #ll = lambda df: df.iloc[0][[ i for i in df.columns if i not in groupby]].T
            #uu = u.groupby(groupby).apply(ll)
            #import ipdb; ipdb.set_trace() 
            u = u.set_index(groupby).sort_index()
            u = u.stack().unstack(wide)
            u = u.reset_index()
            u.rename(columns={"level_2":''}, inplace=True)

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
        
        meta = self.get_argument("meta",False)

        if meta:
            return meta

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

 
