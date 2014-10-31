import logging
from analysis import VenueAnalysis
from api import VenueAPI
from time import sleep

Q = "SELECT learn_line_item_id, optimized_line_item_id, domain_list_id FROM domain_list_viewability"
R = "SELECT * FROM venue_campaign_bucket where active = 1"

def get_campaigns():
    from link import lnk

    rockerbox = lnk.dbs.rockerbox 
    console = lnk.api.console

    line_items = rockerbox.select_dataframe(Q).values
    dapi = VenueAPI(console,None,None)

    campaigns = {}
    for group in line_items:
        campaigns[group[2]] = {
            "campaigns":dapi.get_campaign_ids(group[0]) + dapi.get_campaign_ids(group[1]),
            "advertiser":dapi.get_advertiser(group[0])
        }

    return campaigns 

def get_venue_bucket_campaigns():
    from link import lnk

    rockerbox = lnk.dbs.rockerbox
    venue_buckets = rockerbox.select_dataframe(R)
    
    campaigns = {}
    for bucket,row in venue_buckets.groupby(["bucket_name","external_advertiser_id"]):
        campaigns[bucket[0]] = {
            "campaigns":list(row['campaign_id'].values),
            "advertiser":bucket[1]
        }

    return campaigns

def main():
    from lib.report.utils.loggingutils import basicConfig 
    from link import lnk
    import pandas as pd
    pd.set_option('display.max_columns', 100)
    pd.set_option('display.width', 100)

    basicConfig(options={})

    an_reporting = lnk.api.reporting
    an_api = lnk.api.console
    rb_api = lnk.api.rockerbox
    reporting_db = lnk.dbs.reporting
    venue_db = lnk.dbs.venue


    campaigns = dict(get_campaigns().items() + get_venue_bucket_campaigns().items())
    sleep(15)



    for dl,obj in list(campaigns.iteritems()):
        campaigns = obj['campaigns']
        advertiser_id = obj['advertiser']
        advertiser_name = rb_api.get("/advertiser/%s?format=json" % advertiser_id).json[0]['pixel_source_name']
        print advertiser_name
        try:
            va = VenueAnalysis(an_api,an_reporting,venue_db,rb_api,reporting_db,campaigns,advertiser_id,advertiser_name)

            to_block = va.bad_venues
            to_block['action'] = 'bad'

            to_block = to_block.append(va.hidden_venues)
            to_block['action'] = to_block['action'].fillna('ban')
            to_block = to_block.fillna(0)
            to_block = to_block.replace([pd.np.inf, -pd.np.inf], 0)

            for cp in campaigns:
                to_block['campaign_id'] = cp
                va.block_venues(cp,list(to_block.index))
                va.venue_change_ref(to_block)

            sleep(5)
        except:
           logging.error("%s" % str(obj))
        

if __name__ == "__main__":
    main() 
