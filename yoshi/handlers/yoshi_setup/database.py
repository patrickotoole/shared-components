import logging
import pandas as pd
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

def process_endpoint(endpoint):
    return endpoint.replace('/crusher/dashboard','/crusher/v1/visitor/yoshi_mediaplan').replace('selected_action','filter_id') + '&prevent_sample=true&num_days=2'

COLUMNS =  ['external_advertiser_id','mediaplan', 'num_domains', 'line_item_name']

class SetupDatabase(object):

    def insert(self, data):
        dl = load.DataLoader(self.db)

        if len(data) > 0:
            for c in COLUMNS:
                assert c in data.columns

            dl.insert_df(data, "yoshi_setup",[], COLUMNS)

    def get_yoshi_setup(self, advertiser_id):
        df = self.db.select_dataframe(YOSHI_SETUP%advertiser_id)
        return df

    def get_media_plans(self, advertiser_id):
        df = self.crushercache.select_dataframe(MEDIAPLANS%advertiser_id)
        df['endpoint'] = df['endpoint'].apply(process_endpoint)
        return df


    def get_setup(self, advertiser_id):
        yoshi_setup = self.get_yoshi_setup(advertiser_id)
        media_plans = self.get_media_plans(advertiser_id)
        df = pd.merge(yoshi_setup, media_plans, left_on = 'mediaplan', right_on = 'name', how = 'inner')

        if len(df) > 0:
            df['external_advertiser_id'] = advertiser_id
            return df[COLUMNS + ['endpoint']]
        else:
            return pd.DataFrame()
