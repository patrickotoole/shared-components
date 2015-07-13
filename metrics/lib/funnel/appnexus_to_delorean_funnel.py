import json
from link import lnk
import sys
sys.path.append("../")
from query import MYSQL
from funnel_lib import FunnelAPI

import logging
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

def advertiser_id_to_name(advertiser_id):
    q = MYSQL.ADVERTISER_ID_TO_NAME.format(advertiser_id)
    return db.select_dataframe(q)["pixel_source_name"][0]

def get_profile_ids(search_term):
    r = console.get("/line-item?search={}".format(search_term))

    profile_ids = {}

    for line_item in r.json["response"]["line-items"]:
        if line_item["state"] != "active":
            break
        advertiser_id = line_item["advertiser"]["id"]
        a = advertiser_id_to_name(advertiser_id)

        profile_ids[a] = {}
        profile_ids[a]["profiles"] = set()

        for campaign in line_item["campaigns"]:
            if campaign["profile_id"] and campaign["state"] == "active":
                profile_ids[a]["profiles"].add(str(campaign["profile_id"]))
    
    return profile_ids
    
def get_segment_targets(profile_ids):
    combined = ','.join(profile_ids)
    r = console.get("/profile?id={}".format(combined))
    
    segment_targets = []

    for p in r.json["response"]["profiles"]:
        if p["segment_targets"]:
            for group in p["segment_targets"]:
                segment_targets.append(group)
        if p["segment_group_targets"]:
            for group in p["segment_group_targets"]:
                for segment in group["segments"]:
                    segment_targets.append(segment)


    segment_targets = [(target["id"], target["other_equals"]) for target in segment_targets if "Funnel" in target["name"]]

    segment_targets = set(segment_targets)
    return segment_targets

def post_batch(uids, segment, value=0, expiration=300):
    payload = ["{},{}:{}:{}".format(uid, segment, value, expiration) for uid in uids]

    logger.info("Printing sample of payload:\n{}".format('\n'.join(payload[:5])))
            
    to_post = {
        "uids": payload,
        "source_type": "opt_script",
        "source_name":"some_script_name"
        }
    
    # POST the JSON object to the batch_submit API
    if len(payload) > 0:
        logger.info("Submitting batch request with {} users...".format(len(payload)))
        r = api.post("/batch_request/submit", data=json.dumps(to_post))
        logger.info("Done. Response: {}".format(r.json))
        if "error" in r.json:
            raise Exception("Error: {}".format(r.text))
    else:
        logger.info("Found 0 users who satisfy funnel actions. Skipping funnel..")


def run():
    """For each Funnel campaign
       1.) Get the profile ID
       2.) Get the segment targets associated with each profile ID
       3.) Get the funnel patterns associated with each segment target 
           NOTE: (must be associated with advertiser)
       4.) For each group of patterns (i.e. funnel), get the set of uids matching
           all patterns
       """
    data = get_profile_ids("Funnel")

    logger.info("Profile IDs: {}".format(data))

    funnel_api = FunnelAPI()
    
    for advertiser in data.keys():
        logger.info("Getting segment targets for {}".format(advertiser))
        segment_targets = get_segment_targets(data[advertiser]["profiles"])

        logging.info("Segment Targets: {}".format(segment_targets))
        
        logger.info("Getting urls for {}...".format(advertiser))
        urls = funnel_api.get_urls(advertiser)
        
        logger.info("Getting segment targets...")
        for segment in segment_targets:
            segment_id, step = segment
            # Get the uids for the patterns
            patterns = funnel_api.get_patterns(segment_id=segment_id, step=step)

            uids = funnel_api.get_uids_updated(patterns, urls)

            post_batch(uids, segment_id, step)

console = lnk.api.console
api = lnk.api.rockerbox
db = lnk.dbs.rockerbox
            
run()
