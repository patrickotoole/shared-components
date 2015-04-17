import tornado.web
import ujson
import json
import pandas
import StringIO

from twisted.internet import defer 
from lib.helpers import *
from lib.asi_runner.bidding import run_campaign

class DebugAuctionHandler(tornado.web.RequestHandler):

    def initialize(self, api=None):
        self.api = api


    @decorators.deferred
    def defer_run_auctions(self,campaign_id,uid):
        uid = long(uid) or 7440373686927816718
        data = run_campaign(campaign_id,uid,self.api)
        return data

    @defer.inlineCallbacks 
    def get_auctions(self,campaign_id,uid):
        auctions = yield self.defer_run_auctions(campaign_id,uid)
        self.write(ujson.dumps(auctions))
        self.finish()

        
    @tornado.web.asynchronous
    def get(self,*args):
        campaign = self.get_argument("campaign_id",False)
        uid = self.get_argument("uid",False) 
        if campaign:
            self.get_auctions(campaign,uid)
        else:
            self.write("you must supply a ?campaign_id=&uid=")
            self.finish()

