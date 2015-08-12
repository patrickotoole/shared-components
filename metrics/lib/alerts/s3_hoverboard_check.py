from link import lnk
from helpers import *

m = lnk.api.marathon

def get_source(filename):
    bucket, path = str(filename).split(",")
    path_list = path.split('/')
    for directory in path_list:
        if "source" in directory:
            return directory.split("=")[1]
    return None

def get_broken_apps(s3_conn, default_times=dict()):
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
        bucket = s3_conn.get_bucket(b)
        f = filters[bucket.name]
        for i in bucket.list():
            filename = str(i)
            last_modified = i.last_modified
            source = get_source(filename)
            if source in default_times:
                hours = default_times[source]
            else:
                hours = 2
            if time_since(last_modified, kind="hours") < hours:
                if source in active_apps[f]:
                    active_apps[f].remove(source)

    return active_apps

filter_key = {
    "imps-flume": "hoverboard-syphon-imps-v2",
    "visits-flume": "hoverboard-events",
    "conversions-flume": "hoverboard-conv"
}

default_times = {
    "hotsy_totsy": 5,
    "gazelle": 5
}

MESSAGE = (
    "*WARNING*: Data has not been written to the `%s` S3 bucket for at "
    "least 2 hours for the following advertisers: `%s`. You should check "
    "https://console.aws.amazon.com/s3/home?region=us-east-1#&bucket=%s to confirm."
)

sc = get_slack()
conn = get_s3()

apps = get_broken_apps(conn, default_times)

for app,advertisers in apps.iteritems():
    bucket = filter_key[app]
    if advertisers:
        m = MESSAGE % (bucket, ', '.join(advertisers), bucket)
        sc.api_call("chat.postMessage", channel="#production-alerts", text=m)
