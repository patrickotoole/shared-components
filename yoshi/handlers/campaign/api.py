import pandas as pd
from handlers import DomainsAPI
import tldextract
import json
import time
from datetime import datetime
import logging
import requests
from lib.helpers import decorators
from database import * 

YOSHI_BASE = '''
{
    "profile": {  
              "platform_placement_targets":[ {"id":%(tag_id)s, "action":"include"} ],
              "domain_targets":[{"domain":"%(domain)s"}],
              "domain_action":"include",
              "size_targets":[  
                 {  
                    "width":"728",
                    "height":"90"
                 },{  
                    "width":"300",
                    "height":"250"
                 },{  
                    "width":"160",
                    "height":"600"
                 },{  
                    "width":"300",
                    "height":"600"
                 }
              ],
              "country_targets":[ ],
              "region_targets":[],
              "city_targets":[],
              "domains":"",
              "max_day_imps":"",
              "max_lifetime_imps":15,
              "base_bid":"",
              "daily_budget":"",
              "lifetime_budget":"",
              "country_action":"include",
              "region_action":"include",
              "city_action":"exclude",
              "max_daily_imps":5
    },
    "campaign": {  
              "creatives":[],
              "domains":"",
              "max_day_imps":"",
              "max_lifetime_imps":"",
              "base_bid":1,
              "daily_budget":10,
              "lifetime_budget":100,
              "line_item_id": %(line_item_id)s
    },
    "details": {  
            "prices":[{ "eap":0.5, "ecp":1,"tag_id":%(tag_id)s }],
              "advertiser":%(advertiser_id)s,
              "creative_folders":[],
              "creatives":[],
              "sizes":["%(tag_id)s"],
              "username":"a_%(pixel_source_name)s"
    }
}
'''

YOSHI_IMPS = "/yoshi?domain=%s"

def extract_sld(domain):
    extracted = tldextract.extract(domain)
    if extracted[0] == "" or extracted[0] == "www":
        sld_tld = extracted[1] + "." + extracted[2]
    else:
        sld_tld = extracted[0] + "." + extracted[1] + "." + extracted[2]
    sld_tld = sld_tld.replace("www.","")
    return str(sld_tld.lower())

class CampaignAPI(DomainsAPI, CampaignDatabase):

    @decorators.deferred
    def get_domains_to_create(self, advertiser_id):

        domains_queue = self.get_domains_queue(advertiser_id)
        domains_queue = domains_queue.drop_duplicates(subset=['domain','line_item_name'])
        line_items = self.get_line_items(advertiser_id)
        df = pd.merge(domains_queue, line_items, on = 'line_item_name', how = 'left')
        df['advertiser_id'] = advertiser_id
        return df.fillna(0)

    def create_campaign(self, advertiser_id, data):
        yoshi_obj = YOSHI_BASE % data
        try:
            resp = self.crusher.post("/campaign?format=json", data = json.dumps(json.loads(yoshi_obj)), timeout = 10)
            return resp.json
        except requests.Timeout:
            logging.info("Yoshi campaign post timeout occurred with: \n " + str(yoshi_obj))
            return {}


    def get_yoshi_tags(self, domain):
        resp = self.crusher.get(YOSHI_IMPS%domain)
        logging.info("- found %d imps" %len(resp.json))
        if len(resp.json) > 0:
            yoshi_imps = pd.DataFrame(resp.json)
            assert 'domain' in yoshi_imps.columns
            assert 'tag_id' in yoshi_imps.columns
            return yoshi_imps[['domain','tag_id']].drop_duplicates(subset=['tag_id'])
        return pd.DataFrame() 


    def run_campaign_creation(self, advertiser_id, data, sleep = .5):
        domain = data[0]['domain']
        data = pd.DataFrame(data)
        logging.info("Starting Yoshi creation for %s" %domain)
        self.crusher_authenticate(advertiser_id = advertiser_id, base_url = "http://portal.getrockerbox.com")
        yoshi_tags = self.get_yoshi_tags(domain)

        if len(yoshi_tags) > 0:
            data = pd.merge(data, yoshi_tags, on ='domain')
        else:
            data['tag_id'] = None

        data['pixel_source_name'] = self.get_pixel_source_name(advertiser_id)
        data['created_at'] = None
        data['campaign_id'] = None
        data['placement_id'] = None
        data['last_ran'] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        for k, row in data.iterrows():
            if row['tag_id'] is not None:
                c = self.create_campaign(advertiser_id, row.to_dict())
                time.sleep(sleep)
                if 'campaign' in c.keys() and 'profile' in c.keys():
                    logging.info("- created campaign %s" %c.get('campaign').get('id'))
                    data.ix[k, 'created_at'] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                    data.ix[k, 'campaign_id'] = c.get('campaign').get('id')
                    try:
                        data.ix[k, 'placement_id'] = c.get('profile').get('platform_placement_targets')[0].get('id')
                    except:
                        data.ix[k, 'placement_id'] = None  

        self.log_campaigns(data)
        self.log_domains(data)
