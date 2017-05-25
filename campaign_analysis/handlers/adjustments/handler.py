import tornado.web
import pandas as pd
import json
import logging
import time
from database import *

from slackclient import SlackClient
class SlackWriter():
    
    def __init__(self, channel):
        TOKEN = "xoxp-2171079607-3074847889-26638050530-c10bb6093c"
        self.slackclient = SlackClient(TOKEN)
        self.channel = channel
        
    def load_slack_did(self, name):
        uid = [i['id'] for i in ujson.loads(self.slackclient.api_call("users.list"))['members'] if i['name'] == name][0]
        did = ujson.loads(self.slackclient.api_call("im.open",user=uid))['channel']['id']
        return did
        
    def send_message(self, text):
        self.slackclient.api_call("chat.postMessage", channel = self.channel, text = text )


CAMPAIGN_URL = "/campaign?id=%s&advertiser_id=%s&logFilter=CampaignAdjustments"


class AdjustmentHandler(tornado.web.RequestHandler, DataBase):

    def initialize(self,**kwargs):
        self.api = kwargs.get("api",False) 

    def post(self):
        advertiser_id = self.get_query_argument("advertiser")
        data = json.loads(self.request.body)

        msg = ""

        for d in data:

            url = CAMPAIGN_URL%(d['campaign_id'],advertiser_id)
            obj = {'campaign':{d['field'] : d['new']}}
            
            r = self.api.put(url, data = json.dumps(obj) )
            
            resp = r.json.get('response')
            if resp.get("status", False) == "OK":
                msg += " | %s %s: %s to %s" %(d['campaign_id'], d['field'], d['old'], d['new'])


            time.sleep(.5)


            import ipdb; ipdb.set_trace()

        mt = self.get_media_trader(advertiser_id)

        msg = "@"+mt + " ``` "+ str(msg) + " ```"

        SW = SlackWriter_CA(channel= "campaign_adjustments")
        SW.send_message(text = msg)


