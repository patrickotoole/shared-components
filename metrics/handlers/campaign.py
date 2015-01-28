import tornado.web
import ujson
import pandas
import StringIO
import mock
import time

from base import BaseHandler
from twisted.internet import defer
from lib.helpers import *  

LINE_ITEM_QUERY = "select * from advertiser_line_item where line_item_name like '%%Yoshi%%' and %s "

class YoshiCampaignHandler(BaseHandler):

    def initialize(self, db=None, api=None, **kwargs):
        self.db = db 
        self.api = api

    @decorators.formattable
    def get_content(self,data,advertiser_id):
        
        def default(self,data):
            self.write(str(data))
            self.finish()

        yield default, (data,)

    @decorators.deferred
    def get_line_item_id(self,advertiser_id):
        where = (" external_advertiser_id = %s" % advertiser_id)
        line_item_df = self.db.select_dataframe(LINE_ITEM_QUERY % where)
        return line_item_df.line_item_id[0]


    @decorators.deferred
    def create_campaign(self,line_item_id,advertiser_id,name="test",bid_price=1):
        data = {
            "campaign" : {
                "name": name,
                "state": "inactive",
                "advertiser_id":  advertiser_id,
                "line_item_id": line_item_id,
                "lifetime_budget": 50,
                "inventory_type": "real_time",
                "cpm_bid_type": "base",
                "base_bid": bid_price
            }
        }
        URL = "/campaign?advertiser_id=%s&line_item=%s" % (advertiser_id,line_item_id) 
        data = self.api.post(URL,data=ujson.dumps(data))
        return data.json['response']['campaign']

    @decorators.deferred
    def create_profile(self,advertiser_id,campaign_id,profile):
        URL = "/profile?advertiser_id=%s&campaign_id=%s" % (advertiser_id,campaign_id) 

        data = {
            "profile" : profile
        }
        data['profile']['country_action'] = "include"
        data['profile']['country_targets'] = [{"country": "US"}]

        data = self.api.post(URL,data=ujson.dumps(data))
        return data.json['response']['profile']

    @decorators.deferred
    def set_campaign_profile_id(self,advertiser_id,campaign_id,profile_id):
        URL = "/campaign?advertiser_id=%s&id=%s" % (advertiser_id,campaign_id) 

        data = {
            "campaign" : {
                "id": campaign_id,
                "profile_id": profile_id
            }
        }

        data = self.api.put(URL,data=ujson.dumps(data))
        return data.json
     
    @decorators.deferred
    def defer_get_campaigns(self,advertiser_id,line_item_id):
        URL = "/campaign?advertiser_id=%s&line_item_id=%s" % (advertiser_id,line_item_id)
        data = self.api.get(URL)
        return data.json['response']['campaigns']
     

    @defer.inlineCallbacks 
    def make_campaign(self,advertiser_id,profile):

        line_item_id = yield self.get_line_item_id(advertiser_id) 
        campaign = yield self.create_campaign(line_item_id,advertiser_id,"TEST",1)
        profile = yield self.create_profile(advertiser_id,campaign['id'],{})

        campaign_with_profile = yield self.set_campaign_profile_id(advertiser_id,campaign['id'],profile['id'])

        obj = {
            "campaign":campaign_with_profile,
            "profile":profile
        }

        self.get_content(ujson.dumps(obj),advertiser_id)

       

    @defer.inlineCallbacks
    def get_campaigns(self,advertiser_id):

        line_item_id = yield self.get_line_item_id(advertiser_id)
        campaigns = yield self.defer_get_campaigns(advertiser_id,line_item_id)

        self.get_content(ujson.dumps(campaigns),advertiser_id)

        

        

    @tornado.web.asynchronous
    def get(self):
        advertiser_id = self.current_advertiser
        if advertiser_id: 
            self.get_campaigns(advertiser_id)
        else:
            self.redirect("/")

    @tornado.web.asynchronous
    def post(self):
        advertiser_id = self.current_advertiser
        obj = ujson.loads(self.request.body)
        print obj
        profile = obj.get('profile',False)
        if advertiser_id and profile is not False:
            self.make_campaign(advertiser_id,profile)
        else:
            self.redirect("/") 
