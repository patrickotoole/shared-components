import boto
from boto.s3.connection import S3Connection

import ujson
from datetime import datetime
from slackclient import SlackClient
from link import lnk
import numpy as np
import pandas as pd

api = lnk.api.console
m = lnk.api.marathon
mysql = lnk.dbs.rockerbox

conn = S3Connection('AKIAIVMCHBYD327UXDVA', 'fjdNMx6Pw3iD19z+79n83UMes0zhiMDEmknZCAlO')

def get_slack():
    token = "xoxb-6465676919-uuZ6eLwx0fjJ5JTxTa3yAvMD"
    sc = SlackClient(token)

    sc.rtm_connect()
    return sc

def get_slack_user(name, sc, cache={}):
    did = cache.get(name,False)
    if not did:
        uid = [i['id'] for i in ujson.loads(sc.api_call("users.list"))['members'] if i['name'] == name][0]
        did = ujson.loads(sc.api_call("im.open",user=uid))['channel']['id']
        cache[name] = did
    return did

def rate_limited(func):
    def inner(*args, **kwargs):
        r = func(*args, **kwargs)
        debug_info = r.json["response"]["dbg_info"]

        write_limit = debug_info["write_limit"]
        read_limit = debug_info["read_limit"]

        reads = debug_info["reads"]
        writes = debug_info["writes"]

        if writes >= write_limit:
            print "Sleeping for {} seconds".format(debug_info["write_limit_seconds"] + 2)
            time.sleep(debug_info["write_limit_seconds"] + 2)
            return r
        if reads >= read_limit:
            print "Sleeping for {} seconds".format(debug_info["read_limit_seconds"] + 2)
            time.sleep(debug_info["read_limit_seconds"] + 2)
            return r

        return r

    return inner

@rate_limited
def fetch_campaigns(advertiser_id, start_element=0, pauses="true"):
    url = "/campaign?advertiser_id=%s&start_element=%s&show_alerts=true&pauses=%s" % (advertiser_id, start_element,pauses)
    print "Fetching URL: %s" % url
    r = api.get(url)
    return r

def get_campaigns(advertiser_id, pauses="true"):
    start_element = 0
    campaigns = []
    while True:
        r = fetch_campaigns(advertiser_id, start_element, pauses)
        c = r.json["response"]["campaigns"]

        if len(c) == 0:
            break

        print "Found %s campaigns" % len(c)

        campaigns.extend(c)
        count = r.json["response"]["count"]
        start_element += 100

    return campaigns

def format_msg(c):
    if c["potential_imps_budget"] and not np.isnan(c["potential_imps_budget"]):
        return "imps,%(potential_imps_budget).0f,%(id)s,%(name)s,%(daily_budget_imps).0f,%(max_bid).0f" % c
    else:
        return "spend,%(daily_budget).0f,%(id)s,%(name)s" % c

def get_messages(campaigns):
    messages = []
    
    spend_rows = [
                    format_msg(c)
                    for c in campaigns
                    if not c["potential_imps_budget"] or np.isnan(c["potential_imps_budget"])
                 ]
    
    imps_rows = [ 
                  format_msg(c) 
                  for c in campaigns 
                  if c["potential_imps_budget"] and not np.isnan(c["potential_imps_budget"])
                ]
    
    if spend_rows:
        messages.append("```\nbudget_type,potential_budget,id,name")
        messages.extend(spend_rows)
        messages.append("```\n")

    if imps_rows:
        if spend_rows:
            messages.append("")
        messages.append("```\nbudget_type,potential_budget,id,name,daily_imps_budget,max_bid")
        messages.extend(imps_rows)
        messages.extend(["","Recommendation: Convert the above campaigns to spend-budgets."])
        messages.append("```")
    
    return '\n'.join(messages)

cols = [
    "name",
    "id",
    "daily_budget",
    "daily_budget_imps",
    "cpm_bid_type",
    "base_bid",
    "max_bid",
    "min_bid",
    "advertiser_id"
]
    
users = {}
sc = get_slack()

query = """
select 
    advertiser_name,
    external_advertiser_id, 
    media_trader_slack_name, 
    pixel_source_name 
from advertiser 
where media_trader_slack_name is not null and running=1
"""

# advertiser_ids = [a["id"] for a in advertisers if a["state"] == "active"]
advertisers = mysql.select_dataframe(query).to_dict(orient="records")

for a in advertisers:
    advertiser_name = a["advertiser_name"]
    advertiser_id = a["external_advertiser_id"]
    slack_name = a["media_trader_slack_name"]
    slack_uid = get_slack_user(slack_name, sc, users)
    
    print "ADVERTISER: {}".format(advertiser_name)
    
    campaigns = get_campaigns(advertiser_id, pauses="false")
    
    if not campaigns:
        print "No active campaigns found for advertiser %s" % advertiser_name
        continue
    
    # Fill max_bid is None, use base_bid instead
    for c in campaigns:
        if not c["max_bid"]:
            c["max_bid"] = c["base_bid"]

    df = pd.DataFrame(campaigns)[cols]

    df["potential_imps_budget"] = df.daily_budget_imps / 1000 * df.max_bid
    bad_campaigns = df[(df.potential_imps_budget >= 200) | (df.daily_budget >= 200)]
    
    if len(bad_campaigns) == 0:
        print "No campaigns with high daily potential budgets for advertiser %s" % advertiser_name
        continue
    
    message = "The following campaigns for `%s` have abnormally high potential daily budgets:\n" % advertiser_name \
                + get_messages(bad_campaigns.to_dict(orient="records"))
        
    print "Sending message to %s: \n%s\n" % (slack_name, message)
    sc.api_call("chat.postMessage",channel=slack_uid,text=message,as_user=True)
