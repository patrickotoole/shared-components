import logging
import json
from link import lnk
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

MEDIAPLANS = '''
SELECT name, endpoint
FROM adwords_campaign_endpoint
WHERE advertiser_id = %s
AND active = 1 AND deleted = 0
'''
    
class SetupDatabase(object):

    def insert(self, data):
        dl = load.DataLoader(self.db)
        dl.insert_df(data, "yoshi_setup",[], ['external_advertiser_id', 'mediaplan', 'num_domains','line_item_name'])

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
