import tornado.web
import ujson
import json
import pandas
import StringIO

from twisted.internet import defer 
from lib.helpers import *

class FilterHandler(tornado.web.RequestHandler):

    def initialize(self, bidder=None,do=None,marathon=None):
        self.api = bidder
        self.do = do
        self.marathon = marathon

    @decorators.deferred
    def defer_get_available(self):
        return self.marathon.get("/v2/apps/akka-tree-filter").json['app']['tasks']
    

    @defer.inlineCallbacks 
    def get_listeners(self):
        available = yield self.defer_get_available()
        server = "http://" + available[0]['host'] + ":9999"

        self.render("../templates/admin/filter.html",server=server)
    
    @tornado.web.asynchronous
    def get(self,*args):
        if args and args[0] == "streaming":
            self.render("../templates/admin/bubble_filter.html")
        elif args and args[0] == "sankey":
            print "HERE"
            self.render("../templates/admin/sankey_filter.html")
        else:
            self.get_listeners()

