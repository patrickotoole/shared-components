from link import lnk
from query import MYSQL
import json

from funnel_delorean import FunnelAPI

import logging
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

def advertiser_id_to_name(advertiser_id):
    query = MYSQL.ADVERTISER_ID_TO_NAME.format(advertiser_id)
    return db.select_dataframe(query)["pixel_source_name"][0]

def get_profile_ids(search_term):
    r = console.get("/line-item?search={}".format(search_term))

    profile_ids = {}

    for line_item in r.json["response"]["line-items"]:
        advertiser_id = line_item["advertiser"]["id"]
        a = advertiser_id_to_name(advertiser_id)

        profile_ids[a] = {}
        profile_ids[a]["profiles"] = set()

        for campaign in line_item["campaigns"]:
            if campaign["profile_id"]:
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

    segment_targets = [target["id"] for target in segment_targets]

    segment_targets = set(segment_targets)
    return segment_targets

console = lnk.api.console
api = lnk.api.rockerbox
db = lnk.dbs.rockerbox

# For each Funnel campaign
    # Get the profile ID
    # Get the segment targets associated with each profile ID
    # Get the funnel patterns associated with each segment target 
    #     NOTE: (must be associated with advertiser)
    #
    # For each group of patterns (i.e. funnel), get the set of uids matching
    #     all patterns

data = get_profile_ids("Funnel")
segment_targets = get_segment_targets(data["baublebar"]["profiles"])

funnel_api = FunnelAPI()

for advertiser in data.keys():
    data[advertiser]["targets"] = []

    print "Getting urls for {}...".format(advertiser)
    urls = funnel_api.get_urls(advertiser)

    print "Getting segment targets..."
    for segment in segment_targets:
        # Get the uids for the patterns
        # Put the uids into a JSON object
        # POST the JSON object to the batch_submit API
        patterns = funnel_api.get_patterns(segment_id=segment)
        uids = funnel_api.get_uids(patterns, urls)

        new = {
            "segment": segment, 
            "patterns": patterns,
            "uids": uids
        }
        data[advertiser]["targets"].append(new)

        payload = ["{},{}:0:60".format(uid, segment) for uid in uids]

        to_post = {
            "uids": payload,
            "source_type": "opt_script",
            "source_name":"some_script_name"
        }
        r = api.post("/batch_request/submit", data=json.dumps(to_post))
        print r.text
        
print data

# print segment_targets
