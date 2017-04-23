import logging
import pandas as pd
from lib.appnexus_reporting import load
from handlers import SetupDatabase

PIXEL_SOURCE_NAME = '''
SELECT pixel_source_name FROM advertiser WHERE external_advertiser_id = %s 
'''

DOMAIN_QUEUE_COLUMNS = ["external_advertiser_id", "line_item_name", "domain", "mediaplan", "num_sublinks", "num_tags", "last_ran", "created_at"]

DOMAIN_LOG = '''
SELECT * FROM yoshi_domain_log
WHERE external_advertiser_id = %s AND line_item_name = "%s"
AND created_at is not null
'''

class DomainsDatabase(SetupDatabase):
    
    def get_pixel_source_name(self, advertiser_id):
        df = self.db.select_dataframe(PIXEL_SOURCE_NAME%advertiser_id)
        assert 'pixel_source_name' in df.columns
        if len(df)> 0:
            return df['pixel_source_name'].iloc[0]
        else:
            return ""

    
    def get_created_domains(self, line_items, advertiser_id):
        created = {}
        for li in line_items:
            df = self.db.select_dataframe(DOMAIN_LOG%(advertiser_id, li))
            created[li] = set(df['domain'])
        return created

    def log_domains(self, data):
        logging.info("Logging domains")
        cols = ['domain','line_item_name','external_advertiser_id','num_sublinks','num_tags','last_ran','created_at','mediaplan','num_campaigns']

        data['external_advertiser_id'] = data['advertiser_id']
        domains = data.groupby(['external_advertiser_id','domain','line_item_name']).apply(lambda x: pd.Series({
            'mediaplan': x['mediaplan'].max(),
            'created_at': x['created_at'].max(),
            'last_ran': x['last_ran'].max(),
            'num_sublinks': 5,
            'num_tags': len(x['tag_id'].dropna().unique()),
            'num_campaigns': len(x['campaign_id'].dropna().unique())
        }))
        domains = domains.reset_index()
        domains = domains.where(pd.notnull(domains),None)
        dl = load.DataLoader(self.db)
        dl.insert_df(domains, "yoshi_domain_log",[], cols)

