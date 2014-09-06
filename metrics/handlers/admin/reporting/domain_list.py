import datetime
import pandas
import tornado.web
import logging

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred, run_hive_deferred
from lib.query.HIVE import AGG_APPROVED_AUCTIONS

class DomainListHandler(tornado.web.RequestHandler):
    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive

    @classmethod
    def reformat_domain_data(self,data):
        #helper
        def split_help(x):
            s = x.split(".")
            if len(s[-1]) > 2:
                return ".".join(s[-2:])
            else:
                return ".".join(s[-3:])

        data["domain"] = data.domain.map(lambda x: split_help(x))
        data["domain"] = data.domain.map(lambda x: x.replace("$","").replace("%","").replace("]",""))
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

    @defer.inlineCallbacks
    def get_data(self,q,groupby=False,wide=False):
        t = yield run_hive_session_deferred(self.hive,["set shark.map.tasks=44", "set mapred.reduce.tasks=0",q])
        u = pandas.DataFrame(t)
        u["num_auctions"] = u.num_auctions.astype(int)
        if groupby:
            
            if wide:
                u = u.set_index(groupby.split(",")).sort_index()
                u = u["num_auctions"].unstack(wide)
        self.get_content(u)

    @tornado.web.asynchronous
    def get(self):
        domain_list = self.get_argument("list",False)
        date = self.get_argument("date",datetime.datetime.now().strftime("%y-%m-%d"))
        _from = self.get_argument("start_date",False)
        _until = self.get_argument("end_date",False)

        if not _from: 
            _from = date
        if not _until:
            _until = date

        #w = "date>='%s' and date <='%s'" % (_from, _until)
        w = "date>='%s' " % (_from) 

        default_group = "type,domain"

        if domain_list is not False:
            default_group = "domain"
            w += "and type like '%%%s%%' " % (domain_list) 

        groupby = self.get_argument("groupby",default_group)
        wide = self.get_argument("wide",False)
       
        

        params = {
            "groups": groupby,
            "where" : w
        }
        q = AGG_APPROVED_AUCTIONS % params
        q = " ".join(q.replace('\n',' ').split())

        
        self.get_data(q,groupby,wide)
