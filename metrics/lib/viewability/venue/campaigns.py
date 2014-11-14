from link import lnk
from api import VenueAPI
import logging
from time import sleep

Q = "SELECT learn_line_item_id, optimized_line_item_id, domain_list_id FROM domain_list_viewability where active = 1 and %s "
R = "SELECT * FROM venue_campaign_bucket where active = 1 and %s "

class CampaignGroups(object):
    def __init__(self,db=False,api=False):
        self.db = db or lnk.dbs.rockerbox
        self.api = api or lnk.api.console

    def get_campaigns(self,options):
        logging.info("Getting campaign groups...")
        campaigns = []

        if not options.skip_domain_list:
            
            if options.campaign_bucket != "1=1":
                campaigns = self.get_venue_bucket_campaigns(options.campaign_bucket).items()
            else:
                campaigns += self.get_domain_list_campaigns().items() 
                

        if not options.skip_campaign_bucket:

            if options.domain_list != "1=1":
                campaigns = self.get_domain_list_campaigns(options.domain_list).items() 
            else:
                campaigns += self.get_venue_bucket_campaigns().items()

        
        

        campaigns = dict(campaigns)
        logging.info("Got %s campaign groups" % len(campaigns.keys()))

        return campaigns

    def get_domain_list_campaigns(self,where="1=1"):

        line_items = self.db.select_dataframe(Q % where).values
        dapi = VenueAPI(self.api,None,None)

        campaigns = {}
        for group in line_items:
            campaigns[group[2]] = {
                "campaigns":dapi.get_campaign_ids(group[0]) + dapi.get_campaign_ids(group[1]),
                "advertiser":dapi.get_advertiser(group[0])
            }
        sleep(.5)

        return campaigns 

    def get_venue_bucket_campaigns(self,where="1=1"):

        venue_buckets = self.db.select_dataframe(R % where)
        
        campaigns = {}
        for bucket,row in venue_buckets.groupby(["bucket_name","external_advertiser_id"]):
            campaigns[bucket[0]] = {
                "campaigns":list(row['campaign_id'].values),
                "advertiser":bucket[1]
            }

        return campaigns
     
