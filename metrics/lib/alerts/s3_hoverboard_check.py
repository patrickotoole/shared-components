import boto
from boto.s3.connection import S3Connection

from datetime import datetime
from slackclient import SlackClient
from link import lnk

m = lnk.api.marathon

conn = S3Connection('AKIAIVMCHBYD327UXDVA', 'fjdNMx6Pw3iD19z+79n83UMes0zhiMDEmknZCAlO')

def get_slack():
    token = "xoxb-6465676919-uuZ6eLwx0fjJ5JTxTa3yAvMD"
    sc = SlackClient(token)

    sc.rtm_connect()
    return sc

def time_since(t, format_str="%Y-%m-%dT%H:%M:%S.000Z", kind="hours"):
    diff = datetime.now() - datetime.strptime(t, format_str)
    if kind == "hours":
        return (diff.days * 24) + (diff.seconds / 60.0 / 60.0)
    elif kind == "minutes":
        return (diff.days * 24 * 60) + (diff.seconds / 60.0)
    elif kind == "seconds":
        return (diff.days * 24 * 60 * 60) + diff.seconds

def get_source(filename):
    bucket, path = str(filename).split(",")
    path_list = path.split('/')
    for directory in path_list:
        if "source" in directory:
            return directory.split("=")[1]
    return None

def get_broken_apps():
    filters = {
        "hoverboard-syphon-imps-v2": "imps-flume",
        "hoverboard-events": "visits-flume",
        "hoverboard-conv": "conversions-flume" 
    }

    active_apps = {}

    # Get the list of advertisers set up with the new hoverboard process using the Marathon API
    apps = m.get("/v2/apps").json["apps"]

    for f in filters.values():
        filter_app_ids = [app["id"].split("/")[3:] 
                          for app in apps 
                          if "filter/%s" % f in app["id"] and app["tasksRunning"] > 0]
        sources = set([l[0].replace("-","_") for l in filter_app_ids if l])
        active_apps[f] = sources

    sources = {}

    # For each bucket
    for b in filters:
        bucket = conn.get_bucket(b)
        f = filters[bucket.name]
        for i in bucket.list():
            filename = str(i)
            last_modified = i.last_modified
            if time_since(last_modified, kind="hours") < 2:
                source = get_source(filename)
                if source in active_apps[f]:
                    active_apps[f].remove(source)

    return active_apps

apps = get_broken_apps()

filter_key = {
    "imps-flume": "hoverboard-syphon-imps-v2",
    "visits-flume": "hoverboard-events",
    "conversions-flume": "hoverboard-conv"
}

MESSAGE = (
    "*WARNING*: Data has not been written to the `%s` S3 bucket for at "
    "least 2 hours for the following advertisers: `%s`. You should check "
    "https://console.aws.amazon.com/s3/home?region=us-east-1#&bucket=%s to confirm."
)

sc = get_slack()

for app,advertisers in apps.iteritems():
    bucket = filter_key[app]
    if advertisers:
        m = MESSAGE % (bucket, ', '.join(advertisers), bucket)
        sc.api_call("chat.postMessage", channel="#production-alerts", text=m)
