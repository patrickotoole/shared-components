import datetime
import pandas
import tornado.web
import logging

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_deferred
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
    def get_data(self,q):
        t = yield run_hive_deferred(self.hive,q)
        u = pandas.DataFrame(t)
        self.get_content(u)

    @tornado.web.asynchronous
    def get(self):
        domain_list = self.get_argument("list","")
        date = self.get_argument("date",datetime.datetime.now().strftime("%y-%m-%d"))
        hour = self.get_argument("hour",False)
        groupby = self.get_argument("groupby","domain")
       
        w = "date='%s' and type like '%%%s%%' " % (date,domain_list)
        if hour:
            w += " and hour = '%s'" % hour

        params = {
            "groups": groupby,
            "where" : w
        }
        q = AGG_APPROVED_AUCTIONS % params
        q = " ".join(q.replace('\n',' ').split())
        
        self.get_data(q)
