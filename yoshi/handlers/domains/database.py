import logging
import pandas as pd
from lib.appnexus_reporting import load
from handlers import SetupDatabase

PIXEL_SOURCE_NAME = '''
SELECT pixel_source_name FROM advertiser WHERE external_advertiser_id = %s 
'''

DOMAIN_QUEUE_COLUMNS = ["external_advertiser_id", "line_item_name", "domain", "mediaplan", "num_sublinks", "num_tags", "last_ran", "created_at"]


class DomainsDatabase(SetupDatabase):
    
    def get_pixel_source_name(self, advertiser_id):
        df = self.db.select_dataframe(PIXEL_SOURCE_NAME%advertiser_id)
        assert 'pixel_source_name' in df.columns
        if len(df)> 0:
            return df['pixel_source_name'].iloc[0]
        else:
            return ""

    def get_media_plan_data(self, endpoint):
        resp = self.crusher.get(endpoint)
        return resp.json.get('mediaplan')

    def hindsight_authenticate(self, advertiser_id):
        pixel_source_name = self.get_pixel_source_name(advertiser_id)        
        self.crusher.user = "a_%s" %pixel_source_name
        self.crusher.authenticate()
    
    def get_domains_queue(self, advertiser_id):
        cols = ['domain','line_item_name','mediaplan']

        self.hindsight_authenticate(advertiser_id)
        setups = self.get_setup(advertiser_id)

        if len(setups) > 0 :
            queue = pd.DataFrame()

            for k, row in setups.iterrows():

                domains = self.get_media_plan_data(row['endpoint'])
                if len(domains) > 0:
                    domains = pd.DataFrame(domains[:row['num_domains']])
                    domains['line_item_name'] = row['line_item_name']
                    domains['mediaplan'] = row['mediaplan']
                    queue = pd.concat([queue, domains[cols]])
            return queue
        return pd.DataFrame()



    def write_queue(self, data, table = "yoshi_domain_log"):
        for c in DOMAIN_QUEUE_COLUMNS:
            assert c in data.columns

        dl = load.DataLoader(self.db)
        dl.insert_df(data, table,[], DOMAIN_QUEUE_COLUMNS)

