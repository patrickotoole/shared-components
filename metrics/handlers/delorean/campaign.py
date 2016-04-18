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

class DeloreanCampaignHandler(BaseHandler):

    def initialize(self, db=None, api=None, zookeeper=None, redis=None, **kwargs):
        self.db = db 
        self.api = api

    @decorators.deferred
    def create_delorean(self,delorean_df,template_id):
        template = self.db.select_dataframe("SELECT * FROM delorean_template where template_id = %s" % template_id).ix[0,'body']
        
        segments = delorean_df.apply(lambda x: {"segment_id":x.appnexus_segment_value, "segment_value": x.segment_value})
        print segments

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
    def run_create_from_yoshi_campaign(self,campaign_id,template_id):
        
        yoshi_params = yield self.get_yoshi_campaign(campaign_id)
        delorean_df = yield self.find_delorean(yoshi_params['domain'],yoshi_params['placements'])
        if len(delorean_df) != len(yoshi_params['placements']):
            new_delorean = {
                "domain": yoshi_params['domain'],
                "patterns": [{"pattern":str(p['id'])} for p in yoshi_params['placements']]
            }
            self.write(ujson.dumps({
                "error": "missing delorean patterns",
                "should_exist": new_delorean
            }))
            self.finish()
            return
            
        delorean_campaign = yield self.create_delorean(delorean_df,template_id)

        import ipdb; ipdb.set_trace()
        
  
           
    @tornado.web.asynchronous
    def post(self):
        data = ujson.loads(self.request.body)
        campaign_id = data['campaign_id']
        self.run_create_from_yoshi_campaign(campaign_id,1)

    def get(self):
        self.write("hi")
        self.finish()
