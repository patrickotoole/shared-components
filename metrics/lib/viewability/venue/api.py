import logging
import random
import ujson
import time

def retry(ExceptionToCheck, tries=10, timeout_secs=1.0, logger=None):
    """
    Retry calling the decorated function using an exponential backoff.
    """
    def deco_retry(f):
        def f_retry(*args, **kwargs):
            mtries, mdelay = tries, timeout_secs
            while mtries > 1:
                try:
                    return f(*args, **kwargs)
                except ExceptionToCheck as e:
                    #traceback.print_exc()
                    half_interval = mdelay * 0.10 #interval size
                    actual_delay = random.uniform(mdelay - half_interval, mdelay + half_interval)
                    msg = "Retrying in %.2f seconds ..." % actual_delay
                    if logger is None:
                        logging.exception(msg)
                    else:
                        logger.exception(msg)
                    time.sleep(actual_delay)
                    mtries -= 1
                    mdelay *= 2
            return f(*args, **kwargs)
        return f_retry  # true decorator
    return deco_retry

URL = "/advertiser/viewable/reporting?include=venue&campaign=%s&date=%s&format=json&advertiser_equal=%s"

LOGGING_SQL = "INSERT IGNORE INTO venue_change_ref %(fields)s VALUES %(values)s" 


class VenueAPI(object):
    def __init__(self,api,reporting_db,advertiser_name):
        self.an_api = api
        self.reporting_db = reporting_db
        self.advertiser_name = advertiser_name

    def get_advertiser(self,line_item_id):
        LI_MSG = "AppNexus API line-item (advertiser) request: %s"
        CA_MSG = "AppNexus API advertiser received: %s"

        logging.info(LI_MSG % {"line_item_id":line_item_id})

        response = self.an_api.get("/line-item?id=%s" % line_item_id)
        advertiser_id = response.json["response"]["line-item"]["advertiser_id"] 
        
        return advertiser_id
 

    @retry(Exception,tries=10,timeout_secs=5)
    def get_campaign_ids(self,line_item_id):
        LI_MSG = "AppNexus API line-item request: %s"
        CA_MSG = "AppNexus API campaigns received: %s"

        logging.info(LI_MSG % {"line_item_id":line_item_id})

        response = self.an_api.get("/line-item?id=%s" % line_item_id)
        campaigns = response.json["response"]["line-item"]["campaigns"]
        self.advertiser_id = response.json["response"]["line-item"]["advertiser_id"] 
        id_list = [c["id"] for c in campaigns]
        
        logging.info(CA_MSG % id_list)
        return id_list

    def block_venues(self,campaign_id,venues):
        BLK_MSG = "Blocking %s venues on campaign %s"

        venue_count = len(venues)
        logging.info(BLK_MSG % (venue_count,campaign_id))

        campaign = self.get_campaign(campaign_id)
        is_active = campaign['state'] == "active"
        profile_id = campaign['profile_id']

        if is_active:
            return
        
        venues += self.get_venue_targets(campaign_id)

        if venue_count:
            data = {
                "profile": {
                    "id": profile_id,
                    "venue_targets": venues
                }
            }
            
            
            self.put_venue(profile_id,data)
            
    @retry(Exception,tries=4,timeout_secs=10.0)
    def get_campaign(self,campaign_id):
        campaign = self.an_api.get("/campaign?id=%s" % campaign_id).json["response"]["campaign"] 
        return campaign
        
    @retry(Exception,tries=4,timeout_secs=10.0)         
    def get_venue_targets(self,campaign_id):
        profile = self.an_api.get_profile("/campaign?id=%s" % campaign_id).json["response"]["profile"]
        existing_targets = profile['venue_targets']

        if existing_targets:
            return existing_targets
        else:
            return []
            
    @retry(Exception,tries=4,timeout_secs=10.0)
    def put_venue(self,profile_id,data):
        BLKT_MSG = "Blocked %s venues total"

        _json = ujson.dumps(data)
        response = self.an_api.put("/profile?id=%s" % profile_id,_json).json['response']

        error = response.get('error',False)

        if error and "invalid venue ids" in error:
            H = "invalid venue ids" 
            T = "passed in"

            to_exclude = error.replace(H,"").replace(T,"").replace(" ","").split(",")
            data['profile']['venue_targets'] = [ i for i in data['profile']['venue_targets'] if str(i) not in to_exclude]

            return self.put_venue(profile_id,data)

        profile = response['profile']
        logging.info(BLKT_MSG % len(profile['venue_targets']))
                
 
    @retry(Exception,tries=4,timeout_secs=5.0)
    def get_viewability_df(self,duration="past_month"):
        RQ_MSG = "Rockerbox API request for (%s): %s"
        LN_MSG = "Rockerbox API lines received: %s"

        campaign_string = ",".join(map(str,self.campaign_ids))
        compiled_url = URL % (campaign_string,duration,self.advertiser_name)

        logging.info(RQ_MSG % (campaign_string,duration)) 
        df = self.rb_api.get_report(compiled_url)
        logging.info(LN_MSG % len(df))

        return df

    def venue_change_ref(self,venue_df):
        MSG = "Adding venues to ref_table: %s"
        _cols = ['campaign_id', 'imps', 'served', 'visible', 'loaded', 'percent_visible', 'percent_loaded', 'action'] 

        records = venue_df[_cols].to_records()
        columns = tuple(["venue_id"] + list(venue_df[_cols].columns))
        values = ", ".join(map(str,records)).replace("(u'","('")

        if len(records):
            params = {
                "fields": str(columns).replace("'","`").replace("u`","`"),
                "values": values
            }
            #logging.info(LOGGING_SQL % params)
            self.reporting_db.execute(LOGGING_SQL % params)
            logging.info(MSG % len(venue_df.index))
         

if __name__ == "__main__":
    from link import lnk
    console = lnk.api.console
    _v = VenueAPI(console,None)
    _v.block_venues(5435883,[739373])

