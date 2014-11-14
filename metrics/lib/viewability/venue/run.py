import logging
import pandas as pd

from analysis import VenueAnalysis
from api import VenueAPI
from time import sleep
from link import lnk
from campaigns import CampaignGroups


pd.set_option('display.max_columns', 100)
pd.set_option('display.width', 100)
 


def main():
    from lib.report.utils.loggingutils import basicConfig 
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line
    
    define("skip_domain_list",type=bool,default=False)
    define("skip_campaign_bucket",type=bool,default=False)
    define("skip_hidden_venues",type=bool,default=False) 
    define("domain_list",default="1=1")
    define("campaign_bucket",default="1=1") 
    
    basicConfig(options={})
    parse_command_line()

    an_reporting = lnk.api.reporting
    an_api = lnk.api.console
    rb_api = lnk.api.rockerbox
    reporting_db = lnk.dbs.reporting
    venue_db = lnk.dbs.venue

    campaigns = CampaignGroups(api=an_api).get_campaigns(options)

    
    for dl,obj in list(campaigns.iteritems()):
        campaigns = obj['campaigns']
        advertiser_id = obj['advertiser']
        advertiser_name = rb_api.get("/advertiser/%s?format=json" % advertiser_id).json[0]['pixel_source_name']
        print advertiser_name
        try:
            va = VenueAnalysis(an_api,an_reporting,venue_db,rb_api,reporting_db,campaigns,advertiser_id,advertiser_name)

            to_block = va.bad_venues
            to_block['action'] = 'bad'
            to_block['imps'] = 0
            logging.info("Bad venues: %s" % len(va.bad_venues))

            if not options.skip_hidden_venues:
                to_block = to_block.append(va.hidden_venues)
                to_block['action'] = to_block['action'].fillna('ban') if "action" in to_block.columns else 'ban'
                logging.info("Appneuxs hidden venues: %s" % len(va.hidden_venues))
            
            to_block = to_block.fillna(0)
            to_block = to_block.replace([pd.np.inf, -pd.np.inf], 0)

            for cp in campaigns:
                to_block['campaign_id'] = cp
                va.block_venues(cp,list(to_block.index))
                va.venue_change_ref(to_block)

            sleep(5)
        except Exception, e:
            logging.error("%s %s" % (str(obj),e))
        

if __name__ == "__main__":
    main() 
