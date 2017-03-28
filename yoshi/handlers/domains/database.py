import logging
import json
import pandas as pd
import random
import MySQLdb
from lib.appnexus_reporting import load

YOSHI_SETUP = '''
SELECT mediaplan, num_domains, line_item_name
FROM yoshi_setup
WHERE external_advertiser_id = %s
AND active = 1
'''

ADVERTISER = '''
SELECT pixel_source_name FROM advertiser WHERE external_advertiser_id = %s 
'''

DOMAIN_QUEUE_COLUMNS = ["external_advertiser_id", "line_item_name", "domain", "mediaplan", "num_sublinks", "num_tags", "last_ran", "created_at"]

MEDIAPLANS = '''
SELECT name, endpoint
FROM adwords_campaign_endpoint
WHERE advertiser_id = %s
AND active = 1 AND deleted = 0
'''


def authenticate(crusher, pixel_source_name):    
    crusher.user = "a_" + pixel_source_name
    crusher.password = "admin"
    crusher.base_url = "http://beta.crusher.getrockerbox.com"
    crusher.authenticate()
    return crusher._token

class DomainsDatabase(object):
    
    def get_pixel_source_name(self, advertiser_id):
        df = self.db.select_dataframe(ADVERTISER%advertiser_id)
        assert 'pixel_source_name' in df.columns
        if len(df)> 0:
            return df['pixel_source_name'].iloc[0]
    
    def get_yoshi_setup(self, advertiser_id):

        df = self.db.select_dataframe(YOSHI_SETUP%advertiser_id)
        return df

    def get_media_plans(self, advertiser_id):
        return self.crushercache.select_dataframe(MEDIAPLANS%advertiser_id)

    def get_setup(self, advertiser_id):
        cols = ['num_domains','endpoint','mediaplan','line_item_name']
        yoshi_setup = self.get_yoshi_setup(advertiser_id)
        media_plans = self.get_media_plans(advertiser_id)
        df = pd.merge(yoshi_setup, media_plans, left_on = 'mediaplan', right_on = 'name', how = 'inner')
        return df[cols]


    def get_media_plan_data(self, endpoint):
        resp = self.crusher.get(endpoint)
        return resp.json.get('mediaplan')
    

    def get_domains_queue(self, advertiser_id):
        cols = ['domain','line_item_name','mediaplan']
        df = self.get_setup(advertiser_id)
        queue = pd.DataFrame()

        for k, row in df.iterrows():

            domains = self.get_media_plan_data(row['endpoint'])
            if len(domains) > 0:
                domains = pd.DataFrame(domains)
                assert 'domain' in domains.columns
                domains['line_item_name'] = row['line_item_name']
                domains['mediaplan'] = row['mediaplan']
                queue = pd.concat([queue, domains.iloc[:row['num_domains']][cols]])
        return queue


    def write_queue(self, data, table = "yoshi_domain_queue"):
        dl = load.DataLoader(self.db)
        dl.insert_df(data, table,[], DOMAIN_QUEUE_COLUMNS)

