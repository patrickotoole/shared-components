import datetime
import pandas
import tornado.web
import logging
import ujson
import copy

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred, run_hive_deferred
from lib.query.HIVE import AGG_APPROVED_AUCTIONS

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
            "groups": ["domain", "state"],
            "fields": ["num_auctions"]
        }
    }
}

def groups_to_group_helper(g):
    if g == "advertiser":
        return "SPLIT(type,'_')[0]"
    if g == "domain_count":
        return "count(distinct domain)"
    if g == "num_auctions":
        return "sum(num_auctions)"
    return g
    
 
def groups_to_select_helper(g):
    return "%s as %s" % (groups_to_group_helper(g),g)
    

class AdminReportingBaseHandler(tornado.web.RequestHandler):
    
    def parse_date_where(self):
        date = self.get_argument("date",datetime.datetime.now().strftime("%y-%m-%d"))
        _from = self.get_argument("start_date",date)
        _until = self.get_argument("end_date",date)

        return "date>='%s' and date <='%s'" % (_from, _until)

class DomainListHandler(AdminReportingBaseHandler):
    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
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
            u = u.set_index(groupby.split(",")).sort_index()
            u = u["num_auctions"].unstack(wide)

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
        
        domain_list = self.get_argument("type",False)
        advertiser = self.get_argument("advertiser",False)

        if domain_list:
            return "type"

        if advertiser:
            return "advertiser"
        
        return default

    def parse_select(self):

        default = self.get_argument("select","")
        return default

    def parse_where(self,default="1=1"):

        domain_list = self.get_argument("type",False)
        advertiser = self.get_argument("advertiser",False)

        if domain_list:
            return "type like '%%%s%%' " % (domain_list)

        if advertiser:
            return "type like '%%%s%%' " % (advertiser)

        return default

    def parse_state_where(self,default="1=1"):
 
        state = self.get_argument("state",False)

        if state:
            states = map(lambda x: "state = '%s'" % x, state.split(","))
            return "(" + " or ".join(states) + ")"

        return default 
        

    def make_where(self):
        where_list = [
            self.parse_state_where(),
            self.parse_date_where(), 
            self.parse_where()
        ]
        return " and ".join(where_list)

    def make_query(self,params):
        q = AGG_APPROVED_AUCTIONS % params
        return " ".join(q.replace('\n',' ').split())


    @tornado.web.asynchronous
    def get(self,meta=False):
        formatted = self.get_argument("format",False)

        params = {
            "meta_group": self.get_meta_group(),
            "where" : self.make_where(),
            "additional_selection": self.parse_select()
        }
        meta_data = copy.deepcopy(OPTIONS.get(params["meta_group"],{}).get("meta",{}))

        fields = self.get_argument("fields",False)
        if fields:
            meta_data['groups'] += fields.split(",")


        gs = meta_data.get("groups",[])
        fs = meta_data.get("fields",[])

        groups = map(groups_to_group_helper,gs)
        selects = map(groups_to_select_helper,gs + fs)

        params["groups"] = ",".join(groups)
        params["selects"] = ",".join(selects)

        if meta:
            self.write(ujson.dumps(meta_data))
            self.finish()
        elif formatted:
            self.get_data(
                self.make_query(params),
                params["groups"],
                self.get_argument("wide",False)
            )
        else:
            self.get_content(pandas.DataFrame())
