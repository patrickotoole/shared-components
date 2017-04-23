import logging
from lib.appnexus_reporting import load
from handlers import DomainsDatabase
import pandas as pd

class CampaignDatabase(DomainsDatabase):


    def log_campaigns(self, data):
        logging.info("Logging campaigns")
        cols = ['external_advertiser_id','campaign_id','domain','created_at','placement_id']
        data = data[pd.notnull(data['created_at'])].copy(deep = True)
        data['external_advertiser_id'] = data['advertiser_id']
        data = data.where(pd.notnull(data),None)
        dl = load.DataLoader(self.db)
        dl.insert_df(data, "yoshi_campaign_domains",[], cols)


