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

    def get_media_plan_data(self, endpoint):
        resp = self.crusher.get(endpoint)
        return resp.json.get('domains')

    def crusher_authenticate(self, advertiser_id, base_url = 'http://beta.crusher.getrockerbox.com'):
        pixel_source_name = self.get_pixel_source_name(advertiser_id)        
        self.crusher.user = "a_%s" %pixel_source_name
        self.crusher.base_url = base_url
        self.crusher.authenticate()


    def filter_created(self, domains, line_item_name, advertiser_id):
        already_created = self.db.select_dataframe(DOMAIN_LOG%(advertiser_id, line_item_name))
        domains = domains[domains['domain'].apply(lambda x: x not in already_created['domain'].tolist())] 
        return domains

    def get_media_plan_domains(self, mediaplan_name, mediaplan_data, line_item_name, advertiser_id):

        domains = pd.DataFrame(mediaplan_data)
        domains = self.filter_created(domains, line_item_name, advertiser_id)
        domains['line_item_name'] = line_item_name
        domains['mediaplan'] = mediaplan_name
        return domains

    
    def get_domains_queue(self, advertiser_id):
        cols = ['domain','line_item_name','mediaplan','urls']

        self.crusher_authenticate(advertiser_id)
        logging.info("Loading Setup Params")
        setups = self.get_setup(advertiser_id)
        setups = setups[setups['active']==1]
        logging.info("Loading Hindsight Media Plans")
        media_plans = {}
        if len(setups) > 0:
            for name, group in setups.groupby('mediaplan'):
                logging.info("- %s" %name)
                logging.info("%s" %group['endpoint'].iloc[0])
                media_plans[name] = self.get_media_plan_data(group['endpoint'].iloc[0])

        queue = pd.DataFrame()

        logging.info("Getting domain data")
        for k, row in setups.iterrows():

            domains = self.get_media_plan_domains(row['mediaplan'], media_plans[row['mediaplan']], row['line_item_name'], advertiser_id )
            queue = pd.concat([queue, domains[cols].iloc[:row['num_domains']]])

        return queue

