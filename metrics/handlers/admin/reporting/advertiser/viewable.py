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

JOIN = {
    "type":"v JOIN (select distinct log as log, pattern as pattern, action as action from domain_list where log like '%%%(type)s%%') d on d.pattern = v.domain",
    "static_type": "v LEFT OUTER JOIN domain_list d on d.pattern = v.domain and d.pixel_source_name = v.advertiser",
    "experiment":"v JOIN experiment_test_ref t on v.campaign = t.campaign_id",
    "bucket":"v JOIN (SELECT bucket_name, campaign_id FROM campaign_bucket_ref) t on v.campaign = t.campaign_id"
}

OPTIONS = {
    "default": {
        "meta": {
            "groups" : ["advertiser","campaign"],
            "fields" : ["served","loaded","visible","spent"],
            "formatters" : {
                "campaign":"none",
                "spent": "cpm",
                "tag":"none",
                "seller":"none",
                "timeseries":"timeseries"
            }
        }
    },
    "tag": {
        "meta": {
            "groups" : ["seller","tag","domain"],
            "fields" : ["served","loaded","visible","spent"],
            "formatters" : {
                "campaign":"none",
                "spent": "cpm",
                "tag":"none"
            }
        }
    },
    "domain_list": {
        "meta": {
            "groups" : ["type","domain"],
            "fields" : ["served","loaded","visible","spent"],
            "formatters" : {
                "campaign":"none",
                "spent": "cpm"
            },
            "static_joins" : JOIN["static_type"]
        }
    },
       
    "experiment" : {
        "meta": {
            "groups" : ["experiment", "is_control"],
            "fields" : ["served", "loaded", "percent_loaded", "visible", "percent_visible", "spent"],
            "formatters" :{
                "campaign":"none",
                "spent":"cpm"
            },
            "static_joins" : JOIN["experiment"]
        }
    },

    "experiment_groups" : {
        "meta": {
            "groups" : ["experiment", "group_name", "is_control"],
            "fields" : ["served", "loaded", "percent_loaded", "visible", "percent_visible", "spent"],
            "formatters" :{
                "campaign":"none",
                "spent":"cpm"
            },
            "static_joins" : JOIN["experiment"]
        }
    },
    
    "bucket" : {
        "meta": {
            "groups" : ["advertiser", "bucket"],
            "fields" : ["served", "loaded", "visible", "spent"],
            "formatters" : {
                "campaign": "none",
                "spent": "cpm"
            },
            "static_joins" : JOIN["bucket"]
        }
    },

    "domain": {
        "meta": {
            "groups" : ["domain"],
            "fields" : ["served","loaded","visible","spent"],
            "formatters" : {
                "campaign":"none",
                "spent": "cpm",
                "venue": "none",
                "tag": "none"
            }
        }
    },
    "none": {
        "meta": {
            "groups" : [],
            "fields" : ["served","loaded","visible","spent"],
            "formatters" : {
                "seller":"none",
                "campaign":"none",
                "spent": "cpm",
                "venue": "none",
                "tag": "none",
                "timeseries":"timeseries"
            }
        }
    },
    "type": {
        "meta": {
            "groups" : [],
            "fields" : ["served","loaded","visible","spent"],
            "formatters" : {
                "campaign":"none",
                "spent": "cpm",
                "venue": "none",
                "tag": "none",
                "timeseries":"timeseries"
            },
            "static_joins" : JOIN["static_type"] 
        }
    }
}


# s/\(.\{-}\) .*/    "\1":"\1",/g
GROUPS = {
    "advertiser":"advertiser",
    "date":"date",
    "hour":"hour",
    "campaign":"campaign",
    "seller":"seller",
    "tag":"tag",
    "venue":"venue",
    "domain":"domain",
    "creative":"creative",
    "width":"width",
    "height":"height",
    "type":"d.log",
    "group_name": "group_name",
    "is_control": "is_control",
    "bucket": "bucket_name",
    "experiment": "experiment_id",
    "action":"d.action"
}

FIELDS = {
    "spent":"sum(spent)",
    "total_ecp":"sum(total_ecp)",
    "served":"sum(num_served)",
    "loaded":"sum(num_loaded)",
    "visible":"sum(num_visible)",
    "num_visible_on_load":"sum(num_visible_on_load)",
    "num_long_visit":"sum(num_long_visit)",
    "percent_loaded": "round(sum(num_loaded) / sum(num_served), 3)",
    "percent_visible": "round(sum(num_visible) / sum(num_served), 3)"
}

WHERE = {
    "advertiser":"advertiser like '%%%(advertiser)s%%'",
    "advertiser_equal":"advertiser = '%(advertiser_equal)s'",
    "campaign":"campaign = '%(campaign)s'",
    "venue":"venue = '%(venue)s'", 
    "domain":"domain like '%%%(domain)s%%'",
    "type":"d.log like '%%%(type)s%%'",
    "static_type":"d.log like '%%%(static_type)s%%'", 
    "experiment":"t.experiment_id = '%(experiment)s'",
    "tag":"tag = '%(tag)s'",
    "action":"d.action = '%(action)s'", 
    "seller":"seller = '%(seller)s'"
}




class AdvertiserViewableHandler(AdminReportingBaseHandler):

    QUERY = ADVERTISER_VIEWABLE
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS
    JOINS = JOIN 

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

        #data["domain"] = data.domain.map(lambda x: split_help(x))
        data["domain"] = data.domain.map(lambda x: x.replace("$","").replace("]",""))
        data = data.groupby([c for c in data.columns if c != "served"]).sum()
        return data.reset_index()
        

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            if "domain" in data.columns:
                data = self.reformat_domain_data(data)

            o = Convert.df_to_json(data)
            self.render("admin/reporting/timeseries.html",data=o)

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

        if groupby and wide == "timeseries":

            def timeseries_group(x):
                _v = x[val_cols].T.to_dict().values()
                return _v
                
            group_cols = [ i for i in groupby if i != "date" and i in u.columns]
            val_cols = [ i for i in u.columns if i not in group_cols]

            u = u.set_index(group_cols + ['date']).unstack('date').fillna(0).stack().reset_index()

            grouped = u.groupby(group_cols).sum()
            
            u = u.fillna(0).groupby(group_cols).apply(timeseries_group)
            grouped['timeseries'] = u
            u = grouped.reset_index()
 

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

        try:
            raw = yield run_hive_session_deferred(self.hive,query_list)
            formatted = self.format_data(
                pandas.DataFrame(raw),
                groupby,
                wide
            )

            self.get_content(formatted)
        except Exception, e:
            print e

            self.set_status(408, "Hive server")
            self.finish()

        

    def get_meta_group(self,default="default"):
        
        meta = self.get_argument("meta",False)

        if meta:
            return meta

        return default

    

    @tornado.web.asynchronous
    def get(self,meta=""):

        formatted = self.get_argument("format",False)
        include = self.get_argument("include","").split(",")
        wide = self.get_argument("wide",False)

        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)
        meta_data["is_wide"] = wide

        fields = self.get_argument("fields","").split(",")
        has_fields = len(fields) > 0 and len(fields[0]) > 0

        if has_fields:
            meta_data['fields'] = fields 

        if "meta" in meta:
            if "timeseries" in meta:
                meta_data['fields'] += ["timeseries"]
                
            self.write(ujson.dumps(meta_data))
            self.finish()

        elif formatted:
            groups = meta_data.get("groups",[])
            if "timeseries" in meta:
                wide = "timeseries"
                groups = groups + ["date"]
             
            params = self.make_params(
                groups,
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

 
