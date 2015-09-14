from link import lnk
from lib.helpers import Convert
import json
import logging
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

QUERY = """
SELECT DISTINCT pixel_source_name, url_pattern 
FROM rockerbox.action JOIN 
     rockerbox.action_patterns 
USING (action_id)
"""

def get_actions(db):
    actions = db.select_dataframe(QUERY)
    return actions

def create_node(pattern, segment_id=None, value=0, duration=10080, query=None, children=[]):
    node = {
        "node": {
            "label":"",
            "pattern": pattern
        },
        "children": children
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

def create_action_node(action, query=None):
    # If this action contains multiple patterns
    if "," in action["url_pattern"]:
        patterns = action["url_pattern"].split(',')
        head = create_node(patterns[0])
        last = head
        for p in patterns[1:]:
            n = create_node(p)
            last["children"] = [n]
            last = n
        
        # Only add the query to the last pattern to match
        last["node"]["query"] = query
        return head
    else:
        return create_node(action["url_pattern"], query=query)

def create_edits(nodes):
    edits = {"children": []}
    edits["children"].extend(nodes)
    return edits

def push_edits(edits, label="_actions", filter_type="imps"):
    url = "/delorean/edit/?label=%s&replace=true&type=%s" % (label, filter_type)
    logger.info("Submitting edits: {}".format(edits))    
    r = api.post(url, data=json.dumps(edits))

    print r.text
    if r.text != "1":
        raise Exception("Error with submitting edits: {}".format(edits))
    else:
        logging.info("Sucessfully submitted. Exiting.")

api = lnk.api.rockerbox
db = lnk.dbs.rockerbox

df = get_actions(db)

advertiser_nodes = []
advertisers = df.pixel_source_name.value_counts().index.tolist()

for advertiser in advertisers:
    nodes = []
    actions = Convert.df_to_values(df[df.pixel_source_name == advertiser])
    
    for action in actions:
        node = create_action_node(action)
        nodes.append(node)

    advertiser_node = create_node('"source": "%s' % advertiser, children=nodes)
    advertiser_nodes.append(advertiser_node)

edits = create_edits(advertiser_nodes)
push_edits(edits, label="_actions", filter_type="visits")

if len(actions) > 0:
    pass
else:
    logger.info("Didn't find any actions. Exiting...")
