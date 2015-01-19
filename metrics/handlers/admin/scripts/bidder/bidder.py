import tornado.web
import ujson
import json
import pandas
import StringIO

from twisted.internet import defer 
from lib.helpers import *
from lib.bidder import bidder_controls

class BidderHandler(tornado.web.RequestHandler):

    def initialize(self, bidder=None,do=None,marathon=None):
        self.api = bidder
        self.do = do
        self.marathon = marathon

    @decorators.deferred
    def defer_get_listeners(self):
        return self.do.droplets("listener") 

    @decorators.deferred
    def defer_get_instances(self):
        data = self.api.get("/bidder-instance/222").json['response']['instances']
        return data

    @decorators.deferred
    def defer_get_routes(self,control):
        return control.get_bidder_routes()

    @decorators.deferred
    def defer_get_status(self,control):
        return control.get_status()

    @decorators.deferred
    def defer_get_available(self):
        return self.marathon.get("/v2/apps/docker-bidder").json['app']['tasks']
     

    @defer.inlineCallbacks 
    def get_listeners(self):

        bidders = yield self.defer_get_available()
        droplets = yield self.defer_get_listeners()
        instances = yield self.defer_get_instances()

        df_b = pandas.DataFrame(bidders)
        df_b['ip_address'] = df_b.host.map(bidder_controls.BidderControl.host_to_ip)

        df_i = pandas.DataFrame(instances)
        df_i = df_i.set_index("ip_address")

        df_d = pandas.DataFrame(droplets)
        df_d = df_d.set_index("public_ip_address")
        df_j = df_i.join(df_d,rsuffix="_do")

        current_listeners = (df_j.name + ":" + df_j.port.map(str)).tolist()

        control = bidder_controls.BidderControl(current_listeners)
        routes = yield self.defer_get_routes(control)
        status = yield self.defer_get_status(control) 

        df = pandas.DataFrame(routes).T.join(pandas.DataFrame(status).T)

        self.write("<h4>Load balancers</h4>")
        self.write(df_d.reset_index()[["name","public_ip_address","private_ip_address","status"]].to_html())

        self.write("<h4>Bidders online</h4>")
        self.write(df_b[["host","ip_address","id"]].to_html())

        self.write("<h4>Routing Table</h4>")
        self.write(df.to_html())
        
        self.finish()
    
    @tornado.web.asynchronous
    def get(self):
        
        droplets = self.get_listeners()

