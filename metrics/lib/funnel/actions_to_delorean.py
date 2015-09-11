from link import lnk
import json
import logging
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

QUERY = """
SELECT * 
FROM rockerbox.action JOIN 
     rockerbox.action_patterns 
USING (action_id)
"""

def get_actions(db):
    actions = db.select_dataframe(QUERY)
    return actions

def create_node(pattern, segment_id=None, value=0, duration=10080, query=None):
    node = {
        "node": {
            "label":"",
            "pattern": pattern
        }
    }

    if segment_id:
        node["node"]["segment"] = {
            "id":str(segment_id),
            "value":str(value),
            "duration":str(duration)        
        }

    if query:
        node["node"]["query"] = query

    return node

def create_edits(segment_targets):
    edits = {"children": []}
    edits["children"].extend([create_node(i[1], i[0]) for i in segment_targets])
    return edits

def push_edits(edits):
    url = "/delorean/edit/?label=_actions&replace=true"
    logger.info("Submitting edits: {}".format(edits))    
    r = api.post(url, data=json.dumps(edits))

    print r.text
    if r.text != "1":
        raise Exception("Error with submitting edits: {}".format(edits))
    else:
        logging.info("Sucessfully submitted. Exiting.")

console = lnk.api.console
api = lnk.api.rockerbox
db = lnk.dbs.rockerbox

actions = get_actions(db)

if len(actions) > 0:
    print actions.url_pattern
else:
    logger.info("Didn't find any active campaigns. Exiting...")
