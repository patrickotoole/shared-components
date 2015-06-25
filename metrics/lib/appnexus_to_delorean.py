from link import lnk
import json
import logging
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

def get_profile_ids(search_term):
    r = console.get("/line-item?search={}".format(search_term))
    profile_ids = [ str(campaign["profile_id"])
                    for li in r.json["response"]["line-items"] 
                    for campaign in li["campaigns"] ]
    return profile_ids
    

def get_segment_targets(profile_ids):
    combined = ','.join(profile_ids)
    r = console.get("/profile?id={}".format(combined))

    segment_targets = [group["segments"] 
                       for p in r.json["response"]["profiles"] 
                       for group in p["segment_group_targets"]]

    segment_targets = [(item["id"], item["name"].replace("Delorean - ","")) 
                       for sublist in segment_targets 
                       for item in sublist]
    
    segment_targets = set(segment_targets)
    return segment_targets

def create_node(pattern, segment_id, value=0, duration=10080):
    node = {
        "node": {
            "label":"",
            "pattern": pattern,
            "segment": {
                "id":str(segment_id),
                "value":str(value),
                "duration":str(duration)
            }
        }
    }
    return node

def create_edits(segment_targets):
    edits = {"children": []}
    edits["children"].extend([create_node(i[1], i[0]) for i in segment_targets])
    return edits

def push_edits(edits):
    url = "/delorean/edit/?label=_lookalike&replace=true"
    r = api.post(url, data=json.dumps(edits))
    logger.info("Submitting edits: {}".format(edits))
    
    if r.text != "1":
        raise Exception("Error with submitting edits: {}".format(edits))
    else:
        logging.info("Sucessfully submitted. Exiting.")

console = lnk.api.console
api = lnk.api.rockerbox
db = lnk.dbs.rockerbox

profile_ids = get_profile_ids("Lookalike")
segment_targets = get_segment_targets(profile_ids)
edits = create_edits(segment_targets)
push_edits(edits)
