import tornado.web
import ujson
import pandas
import StringIO
import mock
import time
import logging

from ..base import BaseHandler
from lib.helpers import *  
from twisted.internet import defer 
from delorean import DeloreanOperations
from lib.zookeeper.zk_tree import ZKTreeWithConnection

class DeloreanCampaignDatabase(DeloreanOperations):

    @decorators.deferred
    def create_delorean(self,delorean_df,template_id,campaign_id,reuse_lineitem=False):

        Q = "SELECT * FROM delorean_template where template_id = %s" % template_id
        templates = self.db.select_dataframe(Q).set_index("type")['body'].to_dict()

        profile = ujson.loads(templates['profile'])
        campaign = ujson.loads(templates['campaign'])

        segments = delorean_df.T.apply(lambda x: pandas.Series({
            "id":x.appnexus_segment_id, 
            "other_equals": x.segment_value,
            "expire_minutes": 1440
        }) ).T

        profile['segment_boolean_operator'] = "or"
        profile['segment_group_targets'] = [
            {
                "boolean_operator": "or",
                "segments": segments.to_dict("records")
            }
        ]

        yoshi_campaign = self.api.get("/campaign?id=%s" % campaign_id).json['response']['campaign']
        advertiser_id = yoshi_campaign['advertiser_id']
        campaign['name'] = yoshi_campaign['name'].replace("Yoshi","Delorean")

        if reuse_lineitem:
            campaign['line_item_id'] = yoshi_campaign['line_item_id']
        else:
            line_items = self.api.get("/line-item?advertiser_id=%s" % advertiser_id).json['response']['line-items']
            line_item_name = [line['name'] for line in line_items if line['id'] == yoshi_campaign['line_item_id']][0]
            campaign['line_item_id'] = [line['id'] for line in line_items if (line_item_name in line['name']) and ("Delorean" in line['name'])][0]

        URL = "/profile?advertiser_id=%s" % advertiser_id
        resp_profile = self.api.post(URL,'{"profile":%s}' % ujson.dumps(profile)).json
        
        campaign['profile_id'] = resp_profile['response']['profile']['id']
        URL = "/campaign?advertiser_id=%s&line_item=%s" % (advertiser_id,campaign['line_item_id'])
        resp_campaign = self.api.post(URL,'{"campaign":%s}' % ujson.dumps(campaign)).json

        resp_campaign['profile'] = resp_profile

        return resp_campaign

        
    @decorators.deferred
    def find_delorean(self, domain, placements):

        patterns = "'%s'" % "','".join([str(p['id']) for p in placements])

        Q = """
        SELECT * FROM delorean_segment_patterns p 
        JOIN delorean_segments s on p.delorean_segment_id = s.id 
        WHERE s.domain = '%s' and pattern in (%s)
        """

        df = self.db.select_dataframe(Q % (domain, patterns))

        return df

    @decorators.deferred
    def get_yoshi_campaign(self,campaign_id):
        resp = self.api.get_profile("/campaign?id=%s" % campaign_id)
        profile = resp.json['response']['profile']
        return {"domain": profile['domain_targets'][0]['domain'], "placements": profile['platform_placement_targets']}

    @defer.inlineCallbacks
    def run_create_from_yoshi_campaign(self,campaign_id,template_id,reuse_lineitem):
        
        yoshi_params = yield self.get_yoshi_campaign(campaign_id)
        delorean_df = yield self.find_delorean(yoshi_params['domain'],yoshi_params['placements'])

        if len(delorean_df) != len(yoshi_params['placements']):
            new_delorean = {
                "domain": yoshi_params['domain'],
                "patterns": [{"pattern":str(p['id'])} for p in yoshi_params['placements']]
            }

            self.update(yoshi_params['domain'], new_delorean)

        delorean_df = yield self.find_delorean(yoshi_params['domain'],yoshi_params['placements'])
        delorean_campaign = yield self.create_delorean(delorean_df,template_id,campaign_id,reuse_lineitem)

        self.write(ujson.dumps(delorean_campaign))
        self.finish()

    

class DeloreanCampaignHandler(BaseHandler,DeloreanCampaignDatabase):

    def initialize(self, db=None, api=None, zookeeper=None, redis=None, **kwargs):
        self.db = db 
        self.api = api
        self.zk = zookeeper
        self.redis = redis
        self.tree = ZKTreeWithConnection(self.zk,"kafka-filter/tree/raw_imps_tree")


    @tornado.web.asynchronous
    def post(self):
        data = ujson.loads(self.request.body)
        campaign_id = data['campaign_id']
        template_id = int(self.get_argument("template_id",1))
        seperate_line = self.get_argument("seperate_line",False)

        reuse_lineitem = False if seperate_line else True

        self.run_create_from_yoshi_campaign(campaign_id, template_id, reuse_lineitem)

    def get(self):
        self.write("hi")
        self.finish()
