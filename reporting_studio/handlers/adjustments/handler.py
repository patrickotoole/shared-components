import tornado.web
import pandas as pd
import json
import logging
import time
from database import *
import warnings
warnings.filterwarnings("ignore")

class SlackWriter():
    
    def __init__(self, slack, channel):
        TOKEN = "xoxp-2171079607-3074847889-26638050530-c10bb6093c"
        self.slackclient = slack
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
        self.db = kwargs.get("db",False) 
        self.slack = kwargs.get("slack", False)

    def post(self):
        advertiser_id = self.get_query_argument("advertiser")
        data = json.loads(self.request.body)

        logging.info("starting %d campaign adjustments"%len(data))

        msg = ""

        for d in data:
            logging.info(" - %s %s" %(d['campaign_id'], d['field']))

            url = CAMPAIGN_URL%(d['campaign_id'],advertiser_id)
            obj = {'campaign':{d['field'] : d['new']}}
            
            r = self.api.put(url, data = json.dumps(obj) )
            
            resp = r.json.get('response')
            if resp.get("status", False) == "OK":
                msg += "%s %s: %s to %s | " %(d['campaign_id'], d['field'], d['old'], d['new'])

            if resp.get('error'):
                 msg += "error %s for %s" %(str(resp.get('error')), d['campaign_id'])


            time.sleep(.5)
        logging.info("finished campaign adjustments")

        mt = self.get_media_trader(advertiser_id)

        msg = "@"+mt + " ``` "+ str(msg) + " ```"

        SW = SlackWriter(slack = self.slack, channel= "campaign_adjustments")
        SW.send_message(text = msg)


