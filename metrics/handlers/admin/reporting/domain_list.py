import datetime
import pandas
import tornado.web
import logging

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred, run_hive_deferred
from lib.query.HIVE import AGG_APPROVED_AUCTIONS

class TargetListHandler(tornado.web.RequestHandler):
    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("../templates/_target_reporting.html",stuff=o)

        yield default, (data,)

    @defer.inlineCallbacks
    def get_data(self,q,groupby=False,wide=False):
        t = yield run_hive_session_deferred(self.hive,["set shark.map.tasks=44", "set mapred.reduce.tasks=0",q])
        u = pandas.DataFrame(t)
        if groupby:
            u = u.set_index(groupby.split(",")).sort_index()
            if wide:
                u = u["num_auctions"].unstack(wide)
        self.get_content(u)

    @tornado.web.asynchronous
    def get(self):
        domain_list = self.get_argument("list","")
        date = self.get_argument("date",datetime.datetime.now().strftime("%y-%m-%d"))
        _from = self.get_argument("start_date",False)
        _until = self.get_argument("end_date",False)
        groupby = self.get_argument("groupby","domain")
        wide = self.get_argument("wide",False)
       
        if not _from: 
            _from = date
        if not _until:
            _until = date

        w = "date>='%s' and date <='%s'" % (_from, _until)
        w += "and type like '%%%s%%' " % (domain_list)

        params = {
            "groups": groupby,
            "where" : w
        }
        q = AGG_APPROVED_AUCTIONS % params
        q = " ".join(q.replace('\n',' ').split())
        
        self.get_data(q,groupby,wide)
