import tornado.web
import ujson
import pandas
import StringIO
import mock
import time
import logging

from handlers.campaign import CampaignHandler

from twisted.internet import defer
from lib.helpers import *  

LINE_ITEM_QUERY = "select * from advertiser_line_item where line_item_name like '%%Funnel%%' and %s "
FUNNEL_QUERY = "select * from funnel where %s"
FUNNEL_CAMPAIGN_QUERY = "select * from funnel_campaigns where %s"
FUNNEL_CAMPAIGN_QUERY_CAMPAIGN_IDS = "select * from funnel_campaigns where %s"

CAMPAIGN_GET = "SELECT * from advertiser_campaign where line_item_id = %s"


class FunnelCampaignHandler(CampaignHandler):

    def initialize(self, db=None, api=None, **kwargs):
        self.db = db 
        self.api = api 


    @decorators.deferred
    def get_line_item_id(self,advertiser_id):
        where = (" external_advertiser_id = %s" % advertiser_id)
        line_item_df = self.db.select_dataframe(LINE_ITEM_QUERY % where)
        try:
            return line_item_df.line_item_id[0] 
        except:
            return 0

    @decorators.deferred
    def get_segment_id(self,funnel_id):
        where = (" funnel_id = %s" % funnel_id)
        funnel_df = self.db.select_dataframe(FUNNEL_QUERY % where)
        return funnel_df.segment_id[0] 

    @decorators.deferred
    def defer_get_campaigns(self,advertiser_id,line_item_id):
        URL = "/campaign?advertiser_id=%s&line_item_id=%s" % (advertiser_id,line_item_id)
        data = self.api.get(URL)
        campaigns = data.json['response']['campaigns']

        return campaigns

    @decorators.deferred
    def defer_get_funnel_campaigns(self,funnel_id):
        where = (" funnel_id = %s" % funnel_id)
        funnel_df = self.db.select_dataframe(FUNNEL_CAMPAIGN_QUERY % where)
        return funnel_df

    @decorators.deferred
    def defer_get_funnel_campaigns_by_campaign_ids(self,campaign_ids):
        where = (" campaign_id in (%s)" % ",".join(campaign_ids))
        funnel_df = self.db.select_dataframe(FUNNEL_CAMPAIGN_QUERY % where)
        return funnel_df



    
    @decorators.deferred
    def create_campaign(self,line_item_id,advertiser_id,name="test",campaign={}):
        data = {
            "campaign" : {
                "name": name,
                "state": campaign.get("state","inactive"),
                "advertiser_id":  advertiser_id,
                "line_item_id": line_item_id,
                "lifetime_budget": campaign.get("lifetime_budget",5000),
                "daily_budget": campaign.get("daily_budget",50),
                "inventory_type": "real_time",
                "cpm_bid_type": "base",
                "base_bid": campaign.get("bid_price",1) 
            }
        }
        logging.info(data)
        URL = "/campaign?advertiser_id=%s&line_item=%s" % (advertiser_id,line_item_id) 
        data = self.api.post(URL,data=ujson.dumps(data))
        logging.info(data.content)

        response = data.json['response']
        error = response.get("error",False)
        if error:
            raise Exception(error)
        

        return response['campaign']


    @decorators.deferred
    def create_profile(self,advertiser_id,campaign_id,segment_id,segment_value,profile):
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
        data['profile']['max_lifetime_imps'] = profile.get("max_lifetime_imps",100) or None
        data['profile']['segment_boolean_operator'] = "and"
        data['profile']['segment_targets'] = [{
            "id":segment_id,
            "other_equals": segment_value,
            "action":"include"
        }]

        data = self.api.post(URL,data=ujson.dumps(data))
        logging.info(data.content)

        response = data.json['response']
        error = response.get("error",False)
        if error:
            raise Exception(error)
        

        return response['profile']

    @decorators.deferred
    def insert_campaign_funnel(self,funnel_id, step, campaign_id):
        INSERT_QUERY = "INSERT INTO funnel_campaigns (funnel_id,`order`,campaign_id) VALUE (%s,%s,%s)"
        self.db.execute(INSERT_QUERY % (funnel_id,step,campaign_id))
        return True 

 
    

    @defer.inlineCallbacks 
    def create(self, name, advertiser_id, funnel_id, segment_value, campaign, profile):

        try:
            line_item_id = yield self.get_line_item_id(advertiser_id) 
            segment_id = yield self.get_segment_id(funnel_id)

            campaign = yield self.create_campaign(line_item_id,advertiser_id,name,campaign)
            profile = yield self.create_profile(advertiser_id,campaign['id'],segment_id,segment_value,profile)
            campaign_with_profile = yield self.set_campaign_profile_id(advertiser_id,campaign['id'],profile['id'])

            # after the campaign is created, add the campaign_id to the table
            campaign_id = campaign['id']
            yield self.insert_campaign_funnel(funnel_id,segment_value,campaign_id)
            obj = { "campaign":campaign_with_profile, "profile":profile }
        except Exception as e:
            obj = {"error": str(e)}
        

        
        
        self.write(ujson.dumps(obj))
        self.finish() 


    def make_campaign(self,advertiser_id,funnel_id,step,profile,details,campaign):

        name = "Funnel %s: Step %s (%s)" % (details['funnel_name'],details['step'],funnel_id)
        self.create(name, advertiser_id, funnel_id, step, campaign, profile)



    @defer.inlineCallbacks
    def get_funnel_campaigns(self,advertiser_id,funnel_id):
        line_item_id = yield self.get_line_item_id(advertiser_id)
        funnel_df = yield self.defer_get_funnel_campaigns(funnel_id)
        api_funnels = yield self.defer_get_campaigns(advertiser_id,line_item_id)

        df = funnel_df.set_index("campaign_id").join(pandas.DataFrame(api_funnels).set_index("id"))
        camp = df.fillna(0).T.to_dict().values()

        self.write(ujson.dumps(camp))
        self.finish()
     

    @defer.inlineCallbacks  
    def get_campaigns(self,advertiser_id):
        line_item_id = yield self.get_line_item_id(advertiser_id)
        camp = yield self.defer_get_campaigns(advertiser_id,line_item_id)
        # NEEDS TO ALSO GET THE PROFILE OBJECT
        if len(camp):
            camp_df = pandas.DataFrame(camp).set_index("id")
            funnel_campaign = yield self.defer_get_funnel_campaigns_by_campaign_ids(map(str,camp_df.index))

            df = camp_df.join(funnel_campaign.set_index("campaign_id")).reset_index()
            camp_values = df.fillna(0).T.to_dict().values()
            self.write(ujson.dumps(camp_values))
        else:
            self.write("[]")
        self.finish()
        



    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        
        advertiser_id = self.current_advertiser
        funnel_id = self.get_argument("funnel_id",False)
        if funnel_id:
            self.get_funnel_campaigns(advertiser_id,funnel_id)
        elif advertiser_id: 
            self.get_campaigns(advertiser_id)
        else:
            self.write("need to be logged in")
            self.finish()

    @defer.inlineCallbacks
    def modify_campaign(self,advertiser_id,campaign_id,campaign):
        campaign = yield self.defer_modify_campaign(advertiser_id,campaign_id,campaign)
        obj = {"campaign":campaign['campaign']} 

        self.write(ujson.dumps(obj))
        self.finish()



    @tornado.web.authenticated
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

        print advertiser_id, campaign_id, campaign
        if advertiser_id and campaign_id and campaign:
            self.modify_campaign(advertiser_id,campaign_id,campaign)
        else:
            self.finish()

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def post(self):

        advertiser_id = self.current_advertiser
        obj = ujson.loads(self.request.body)
        profile = obj.get('profile',False)
        details = obj.get('details',{})
        campaign = obj.get('campaign',{})
        funnel_id = details.get("funnel_id",False)
        step = details.get("step",False)


        if advertiser_id and profile is not False and funnel_id is not False:
            self.make_campaign(advertiser_id,funnel_id,step,profile,details,campaign)
        else:
            self.write("need to be logging and supply a profile object in the json you post")
            self.finish() 


