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
CAMPAIGN_BUCKET = "INSERT INTO campaign_bucket (external_advertiser_id, campaign_id, bucket_name) VALUES (%s, %s, '%s')"

def make_name(domain_targets, sizes):

    base = "Yoshi"
    domains = ",".join([d['domain'] for d in domain_targets[:4]]) 
    domains += (", and %s more" % len(domain_targets)) if len(domain_targets) > 4 else ""
    sizes = ",".join(sizes)
  
    return base + " | " + domains + " | " + sizes

class CampaignHandler(BaseHandler):

    @decorators.deferred
    def get_line_item_id(self,advertiser_id):
        where = (" external_advertiser_id = %s" % advertiser_id)
        line_item_df = self.db.select_dataframe(LINE_ITEM_QUERY % where)
        return line_item_df.line_item_id[0] 

    @decorators.deferred
    def defer_get_campaigns(self,advertiser_id,line_item_id):
        URL = "/campaign?advertiser_id=%s&line_item_id=%s" % (advertiser_id,line_item_id)
        data = self.api.get(URL)
        campaigns = data.json['response']['campaigns']

        return campaigns

    @decorators.deferred
    def defer_get_profile(self,advertiser_id,profile_id):
        URL = "/profile?advertiser_id=%s&id=%s" % (advertiser_id,profile_id)
        data = self.api.get(URL)
        profile = data.json['response']['profile']

        return profile

    @decorators.deferred
    def defer_modify_campaign(self,advertiser_id,campaign_id,campaign):
        URL = "/campaign?advertiser_id=%s&id=%s" % (advertiser_id,campaign_id)
        data = self.api.put(URL,data=ujson.dumps({"campaign":campaign}))
        return data.json['response']
     
    @decorators.deferred
    def set_campaign_profile_id(self,advertiser_id,campaign_id,profile_id):
        URL = "/campaign?advertiser_id=%s&id=%s" % (advertiser_id,campaign_id) 

        to_post = {"campaign": {"id": campaign_id, "profile_id": profile_id }}
        data = self.api.put(URL,data=ujson.dumps(to_post))
        return data.json['response']['campaign']


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
            df = df[['advertiser_id','id','name','base_bid','daily_budget','state','creatives','profile_id','lifetime_budget']]
            

        if self.get_argument("format",False) == False:     
            pass

        self.get_content(df,advertiser_id)

    @decorators.formattable
    def get_content(self,data,advertiser_id):
        
        def default(self,data):
            o = Convert.df_to_json(data) 
            self.render("campaign.html",data=o,advertiser_id=advertiser_id,user_id=0)

        yield default, (data,)


class AdminCampaignHandler(CampaignHandler):

    def initialize(self, db=None, api=None, **kwargs):
        self.db = db 
        self.api = api

    @decorators.deferred
    def create_admin_campaign(self,line_item_id,advertiser_id,name="test",bid_price=2,creatives=[]):
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
                "daily_budget_imps": 10000,
                "creatives":creatives
            }
        }
        logging.info(data)
        URL = "/campaign?advertiser_id=%s&line_item=%s" % (advertiser_id,line_item_id) 
        data = self.api.post(URL,data=ujson.dumps(data))
        logging.info(data.content)
        return data.json['response']['campaign'] 

    @decorators.deferred
    def create_admin_profile(self,advertiser_id,campaign_id,profile):
        #import ipdb; ipdb.set_trace()
        profile = {k:v for k,v in profile.items() if "targets" not in k or ("targets" in k and v != 0)} 

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
        data['profile']['country_action'] = "exclude" if len(profile.get("country_targets",[])) == 0 else "include"
        data['profile']['region_action'] = "exclude" if len(profile.get("region_targets",[])) == 0 else "include" 
        data['profile']['dma_action'] = "exclude" if len(profile.get("dma_targets",[])) == 0 else "include"  

        data = self.api.post(URL,data=ujson.dumps(data))
        return data.json['response']['profile']


    @defer.inlineCallbacks  
    def admin_create(self, name, line_item_id, advertiser_id, price, campaign, profile): 
        creatives = campaign.get("creatives",[])

        campaign = yield self.create_admin_campaign(line_item_id,advertiser_id,name,price,creatives)
        profile = yield self.create_admin_profile(advertiser_id,campaign['id'],profile)
        campaign_with_profile = yield self.set_campaign_profile_id(advertiser_id,campaign['id'],profile['id'])

        obj = { "campaign":campaign_with_profile, "profile":profile }
        df = pandas.DataFrame(obj)

        self.write(ujson.dumps(obj))
        self.finish()  



class UserCampaignHandler(CampaignHandler):

    def initialize(self, db=None, api=None, **kwargs):
        self.db = db 
        self.api = api 

    @decorators.deferred
    def create_campaign(self,line_item_id,advertiser_id,name="test",bid_price=1,creatives=[],campaign={}):
        data = {
            "campaign" : {
                "name": name,
                "state": "inactive",
                "advertiser_id":  advertiser_id,
                "line_item_id": line_item_id,
                "lifetime_budget": campaign.get("lifetime_budget",5000),
                "daily_budget": campaign.get("daily_budget",50),
                "inventory_type": "real_time",
                "cpm_bid_type": "base",
                "base_bid": bid_price,
                "creatives": creatives
            }
        }
        logging.info(data)
        URL = "/campaign?advertiser_id=%s&line_item=%s" % (advertiser_id,line_item_id) 
        data = self.api.post(URL,data=ujson.dumps(data))
        logging.info(data.content)
        return data.json['response']['campaign']

    @decorators.deferred
    def create_profile(self,advertiser_id,campaign_id,profile):
        p = {k:v for k,v in profile.items() if "targets" not in k or ("targets" in k and v != 0)}
        URL = "/profile?advertiser_id=%s&campaign_id=%s" % (advertiser_id,campaign_id) 

        data = {
            "profile" : p
        }
        data['profile']['country_action'] = "include"
        data['profile']['country_targets'] = data['profile'].get("country_targets",[{"country": "US"}])
        data['profile']['device_type_targets'] = ["phone"]
        data['profile']['supply_type_targets'] = ["mobile_app", "mobile_web"]
        data['profile']['max_day_imps'] = profile.get("max_day_imps",5) or None
        data['profile']['max_lifetime_imps'] = profile.get("max_lifetime_imps",15) or None
        data['profile']['allow_unaudited'] = True 

        data['profile']['region_action'] = "exclude" if len(profile.get("region_targets",[])) == 0 else "include" 
        data['profile']['dma_action'] = "exclude" if len(profile.get("dma_targets",[])) == 0 else "include"   

        data = self.api.post(URL,data=ujson.dumps(data))
        return data.json['response']['profile']

    @defer.inlineCallbacks 
    def create(self, name, line_item_id, advertiser_id, price, campaign, profile):

        #import ipdb; ipdb.set_trace()
        campaign = yield self.create_campaign(line_item_id,advertiser_id,name,campaign.get("base_bid",1),campaign.get("creatives",[]),campaign)
        profile = yield self.create_profile(advertiser_id,campaign['id'],profile)
        campaign_with_profile = yield self.set_campaign_profile_id(advertiser_id,campaign['id'],profile['id'])

        obj = { "campaign":campaign_with_profile, "profile":profile }
        df = pandas.DataFrame(obj)
        
        self.db.execute(CAMPAIGN_BUCKET % (advertiser_id, campaign['id'], name))

        self.write(ujson.dumps(obj))
        self.finish() 


    

class YoshiCampaignHandler(AdminCampaignHandler,UserCampaignHandler):
    """
    Handles campaign creation, updates and retrevial for Yoshi
    """

    def initialize(self, db=None, api=None, **kwargs):
        self.db = db 
        self.api = api
        
    @defer.inlineCallbacks  
    def make_campaign(self,advertiser_id,profile,details,campaign):

        price = 1
        name = make_name(profile['domain_targets'], details['sizes'])
        is_admin = details.get('username','').startswith("a_")

        line_item_id = yield self.get_line_item_id(advertiser_id) 

        create_func = self.admin_create if is_admin else self.create
        create_func(name, line_item_id, advertiser_id, price, campaign, profile)

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
        """
        Requires a logged in user. Expects a json object that contains the 
        relevant campaign fields which need to be updated.
        """
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
        else:
            self.finish()


    @tornado.web.asynchronous
    def post(self):
        advertiser_id = self.current_advertiser
        obj = ujson.loads(self.request.body)
        profile = obj.get('profile',False)
        details = obj.get('details',{})
        campaign = obj.get('campaign',{})

        #import ipdb; ipdb.set_trace()
        if advertiser_id and profile is not False:
            self.make_campaign(advertiser_id,profile,details,campaign)
        else:
            self.write("need to be logging and supply a profile object in the json you post")
            self.finish()
