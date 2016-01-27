import tornado.web
import ujson
import pandas
import lib.zookeeper.zk_endpoint as zk
from handlers.base import BaseHandler
from action_auth import ActionAuth
from lib.helpers import APIHelpers

class ZKHandler(BaseHandler, ActionAuth,APIHelpers):

    def initialize(self, db=None, zookeeper=None, **kwargs):
        self.db = db
        self.zookeeper = zookeeper
    
    @tornado.web.authenticated
    def post(self):
        try:
            data = self.request.body
            found = zk.find_advertiser_child_num(data["advertiser"])
            if(found >=0):
                zk.add_advertiser_pattern(data["advertiser"],data["pattern"])
            else:
                zk.add_advertiser(data["advertiser"])
                if data["pattern"]:
                    zk.add_advertiser_pattern(data["advertiser"],data["pattern"])
            self.write_response(True)
        except Exception, e:
            self.write_response(str(e),e)

    @tornado.web.authenticated
    def get(self):
        try:
            self.write_response(zk.ZKEndpoint(self.zookeeper).get_tree())
            #self.write_response(Convert.df_to_values(results))
        except Exception, e:
            self.write_response(str(e),e)
