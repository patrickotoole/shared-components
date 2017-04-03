import logging
import pandas as pd
from lib.appnexus_reporting import load
from handlers import DomainsDatabase, UrlDatabase
import tldextract
import ujson
import json
import time
from datetime import datetime
import logging
import pprint
import requests

LINE_ITEMS = '''
SELECT line_item_name, MAX(line_item_id) as line_item_id
FROM
(
    SELECT b.line_item_id, max(b.line_item_name) as line_item_name, COUNT(*) as num_campaigns
    FROM advertiser_campaign a
    JOIN advertiser_line_item b
    ON (a.line_item_id = b.line_item_id)
    WHERE a.external_advertiser_id = %(advertiser_id)s AND b.external_advertiser_id = %(advertiser_id)s
    AND a.deleted = 0
    GROUP BY 1
    HAVING num_campaigns < 500
) l
GROUP BY 1
'''

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


class CampaignDatabase(DomainsDatabase, UrlDatabase):

    def get_line_items(self, advertiser_id):
        return self.db.select_dataframe(LINE_ITEMS%{'advertiser_id':advertiser_id})

    def get_domains(self, advertiser_id):

        domains_queue = self.get_domains_queue(advertiser_id)
        domains_queue = domains_queue.drop_duplicates(subset=['domain','line_item_name'])
        urls = self.get_domain_links(",".join(domains_queue['domain'].unique().tolist()))

        line_items = self.get_line_items(advertiser_id)

        df = pd.merge(domains_queue, urls, on = 'domain', how = 'left')
        df = pd.merge(df, line_items, on = 'line_item_name', how = 'left')
        df['advertiser_id'] = advertiser_id

        return df.fillna(0)

    def created_campaign(self, advertiser_id, data):
        yoshi_obj = YOSHI_BASE % data
        try:
            resp = self.crusher.post("/campaign?format=json", data = json.dumps(json.loads(yoshi_obj)), timeout = 10)
            return resp.json
        except requests.Timeout:
            logging.info("Yoshi campaign post timeout occurred with: \n " + str(yoshi_obj))
            return {}


    def get_yoshi_tags(self, domain):
        resp = self.crusher.get(YOSHI_IMPS%domain)
        if len(resp.json) > 0:
            yoshi_imps = pd.DataFrame(resp.json)
            assert 'domain' in yoshi_imps.columns
            assert 'tag_id' in yoshi_imps.columns
            return yoshi_imps[['domain','tag_id']].drop_duplicates(subset=['tag_id'])
        return pd.DataFrame() 


    def run_campaign_creation(self, advertiser_id, domain):
        logging.info("Starting Yoshi creation for %s" %domain['key'])
        
        self.crusher_authenticate(advertiser_id = advertiser_id, base_url = "http://portal.getrockerbox.com")
        yoshi_tags = self.get_yoshi_tags(domain['key'])
        if len(yoshi_tags) > 0 :
            df = pd.merge(pd.DataFrame(domain['values']), yoshi_tags, on = 'domain')
            df['pixel_source_name'] = self.get_pixel_source_name(advertiser_id)
            df['created_at'] = None
            df['campaign_id'] = None
            df['placement_id'] = None
            df['last_ran'] = None

            for k, row in df.iterrows():
                c = self.created_campaign(advertiser_id, row.to_dict())
                time.sleep(.5)

                if 'campaign' in c.keys() and 'profile' in c.keys():
                    logging.info("Created campaign %s" %c.get('campaign').get('id'))

                    df.ix[k, 'created_at'] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                    df.ix[k, 'campaign_id'] = c.get('campaign').get('id')
                    try:
                        df.ix[k, 'placement_id'] = c.get('profile').get('platform_placement_targets')[0].get('id')
                    except:
                        df.ix[k, 'placement_id'] = None

                df.ix[k, 'last_ran'] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

            self.log_campaigns(df)
            self.log_domains(df)


    def log_campaigns(self, data):
        logging.info("Logging campaigns")
        cols = ['external_advertiser_id','campaign_id','domain','created_at','placement_id']
        data = data[pd.notnull(data['created_at'])]
        data['external_advertiser_id'] = data['advertiser_id']
        data = data.where(pd.notnull(data),None)
        dl = load.DataLoader(self.db)
        dl.insert_df(data, "yoshi_campaign_domains",[], cols)

    def log_domains(self, data):
        logging.info("Logging domains")
        cols = ['domain','line_item_name','external_advertiser_id','num_sublinks','num_tags','last_ran','created_at','mediaplan','num_campaigns']

        data['external_advertiser_id'] = data['advertiser_id']
        domains = data.groupby(['external_advertiser_id','domain','line_item_name']).apply(lambda x: pd.Series({
            'mediaplan': x['mediaplan'].max(),
            'created_at': x['created_at'].max(),
            'last_ran': x['last_ran'].max(),
            'num_sublinks': len(x['url'].unique()),
            'num_tags': len(x['tag_id'].unique()),
            'num_campaigns': len(x['campaign_id'].dropna().unique())
        }))
        domains = domains.reset_index()
        domains = domains.where(pd.notnull(domains),None)
        dl = load.DataLoader(self.db)
        dl.insert_df(domains, "yoshi_domain_log",[], cols)
