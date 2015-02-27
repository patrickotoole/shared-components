import tornado.web
import ujson
import pandas
import StringIO
import mock
import time
import logging

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
            o = Convert.df_to_json(data) 
            self.render("campaign.html",data=o,advertiser_id=advertiser_id,user_id=0)
            #self.write(data.to_html())
            #self.finish()

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
                "lifetime_budget": 5000,
                "daily_budget": 50,
                "inventory_type": "real_time",
                "cpm_bid_type": "base",
                "base_bid": bid_price
            }
        }
        logging.info(data)
        URL = "/campaign?advertiser_id=%s&line_item=%s" % (advertiser_id,line_item_id) 
        data = self.api.post(URL,data=ujson.dumps(data))
        logging.info(data.content)
        return data.json['response']['campaign']

    @decorators.deferred
    def create_admin_campaign(self,line_item_id,advertiser_id,name="test",bid_price=2):
        data = {
            "campaign" : {
                "name": name,
                "state": "inactive",
                "advertiser_id":  advertiser_id,
                "line_item_id": line_item_id,
                "inventory_type": "real_time",
                "cpm_bid_type": "clearing",
                "max_bid": 2,
                "lifetime_budget_imps": 2000,
                "daily_budget_imps": 10000
            }
        }
        logging.info(data)
        URL = "/campaign?advertiser_id=%s&line_item=%s" % (advertiser_id,line_item_id) 
        data = self.api.post(URL,data=ujson.dumps(data))
        logging.info(data.content)
        return data.json['response']['campaign'] 

    @decorators.deferred
    def create_profile(self,advertiser_id,campaign_id,profile):
        URL = "/profile?advertiser_id=%s&campaign_id=%s" % (advertiser_id,campaign_id) 

        data = {
            "profile" : profile
        }
        data['profile']['country_action'] = "include"
        data['profile']['country_targets'] = [{"country": "US"}]
        data['profile']['device_type_targets'] = ["phone"]
        data['profile']['supply_type_targets'] = ["mobile_app", "mobile_web"]
        data['profile']['max_day_imps'] = 5
        data['profile']['max_lifetime_imps'] = 15

        data = self.api.post(URL,data=ujson.dumps(data))
        return data.json['response']['profile']

    @decorators.deferred
    def create_admin_profile(self,advertiser_id,campaign_id,profile):
        URL = "/profile?advertiser_id=%s&campaign_id=%s" % (advertiser_id,campaign_id) 

        data = {
            "profile" : profile
        }
        data['profile']['device_type_targets'] = ["phone"]
        data['profile']['supply_type_targets'] = ["mobile_app", "mobile_web"]
        data['profile']['max_day_imps'] = 5
        data['profile']['max_lifetime_imps'] = 15
        data['profile']['allow_unaudited'] = True
        data['profile']['daypart_targets'] = [
            {u'day': u'sunday', u'end_hour': 0, u'start_hour': 0},
            {u'day': u'sunday', u'end_hour': 23, u'start_hour': 8},
            {u'day': u'monday', u'end_hour': 0, u'start_hour': 0},
            {u'day': u'monday', u'end_hour': 23, u'start_hour': 8},
            {u'day': u'tuesday', u'end_hour': 0, u'start_hour': 0},
            {u'day': u'tuesday', u'end_hour': 23, u'start_hour': 8},
            {u'day': u'wednesday', u'end_hour': 0, u'start_hour': 0},
            {u'day': u'wednesday', u'end_hour': 23, u'start_hour': 8},
            {u'day': u'thursday', u'end_hour': 0, u'start_hour': 0},
            {u'day': u'thursday', u'end_hour': 23, u'start_hour': 8},
            {u'day': u'friday', u'end_hour': 0, u'start_hour': 0},
            {u'day': u'friday', u'end_hour': 23, u'start_hour': 8},
            {u'day': u'saturday', u'end_hour': 0, u'start_hour': 0},
            {u'day': u'saturday', u'end_hour': 23, u'start_hour': 8}
        ]


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

    @decorators.deferred
    def defer_modify_campaign(self,advertiser_id,campaign_id,campaign):
        URL = "/campaign?advertiser_id=%s&id=%s" % (advertiser_id,campaign_id)
        data = self.api.put(URL,data=ujson.dumps({"campaign":campaign}))
        return data.json['response']
     

    @defer.inlineCallbacks 
    def make_campaign(self,advertiser_id,profile,details):
        name = "Yoshi"
        name += " | " + ",".join([d['domain'] for d in profile['domain_targets'][:4]]) + (", and %s more" % len(profile['domain_targets']) if len(profile['domain_targets']) > 4 else "")
        name += " | " + ",".join(details['sizes'])

        price = 1 # need to get this from details

        line_item_id = yield self.get_line_item_id(advertiser_id) 
        if details.get('username','').startswith("a_"):
            campaign = yield self.create_admin_campaign(line_item_id,advertiser_id,name,price)
            profile = yield self.create_admin_profile(advertiser_id,campaign['id'],profile)
        else:
            campaign = yield self.create_campaign(line_item_id,advertiser_id,name,price)
            profile = yield self.create_profile(advertiser_id,campaign['id'],profile)

        campaign_with_profile = yield self.set_campaign_profile_id(advertiser_id,campaign['id'],profile['id'])

        obj = {
            "campaign":campaign_with_profile,
            "profile":profile
        }
        df = pandas.DataFrame(obj)
        
        if not details.get('username','').startswith("a_"):
            self.db.execute("INSERT INTO campaign_bucket (external_advertiser_id, campaign_id, bucket_name) VALUES (%s, %s, '%s')" % (advertiser_id, campaign['id'], name))
        self.write(ujson.dumps(obj))
        self.finish()
        #self.get_content(df,advertiser_id)
       
    @defer.inlineCallbacks
    def modify_campaign(self,advertiser_id,campaign_id,campaign):
        campaign = yield self.defer_modify_campaign(advertiser_id,campaign_id,campaign)
        self.get_content(pandas.DataFrame([campaign]),advertiser_id)

    @defer.inlineCallbacks
    def get_campaigns(self,advertiser_id):

        line_item_id = yield self.get_line_item_id(advertiser_id)
        campaigns = yield self.defer_get_campaigns(advertiser_id,line_item_id)

        df = pandas.DataFrame(campaigns)
        if len(df) > 0 and self.get_argument("show_all",False) == False:
            if not self.get_argument("show_deleted",False):
                df = df[df.comments != "deleted"]
            df = df[['id','name','base_bid','daily_budget','state']]
            

        if self.get_argument("format",False) == False:     
            pass
            #self.write("<h4>Yoshi campaigns</h4>")

        self.get_content(df,advertiser_id)

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        advertiser_id = self.current_advertiser
        if advertiser_id: 
            self.get_campaigns(advertiser_id)
        else:
            self.write("need to be logged in")
            self.finish()

    @tornado.web.asynchronous
    def put(self):
        advertiser_id = self.current_advertiser
        campaign_id = self.get_argument("id",False)
        state = self.get_argument("state",False)
        if state:
            campaign = {"state":state}
        else:
            obj = ujson.loads(self.request.body)
            campaign = obj.get("campaign",False)
        
        if advertiser_id and campaign_id and campaign:
            self.modify_campaign(advertiser_id,campaign_id,campaign)


    @tornado.web.asynchronous
    def post(self):
        advertiser_id = self.current_advertiser
        obj = ujson.loads(self.request.body)
        print obj
        profile = obj.get('profile',False)
        details = obj.get('details',{})
        if advertiser_id and profile is not False:
            self.make_campaign(advertiser_id,profile,details)
        else:
            self.write("need to be logging and supply a profile object in the json you post")
            self.finish()

