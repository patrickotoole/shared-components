import pandas
import tornado.web
import ujson

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred

import domain_list
import summary
import viewable

OPTIONS = {
    "groupings": {
        "targeting" : domain_list.GROUPS.keys(),
        "summary" : summary.GROUPS.keys(),
        "viewable" : viewable.GROUPS.keys()
    },
    "fields": {
        "targeting" : domain_list.FIELDS.keys(),
        "summary" : summary.FIELDS.keys(),
        "viewable" : viewable.FIELDS.keys()
    }
}

class AdvertiserReportingHandler(tornado.web.RequestHandler):

    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive

    @decorators.formattable
    def get_content(self,data=False):

        def default(self,data):
            j = ujson.dumps(OPTIONS)
            self.render("admin/reporting/target_list.html",data=j)

        yield default, (data,)
    
    @tornado.web.asynchronous
    def get(self,meta=False):
        self.get_content()

 