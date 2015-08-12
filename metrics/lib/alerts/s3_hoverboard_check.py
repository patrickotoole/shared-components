from link import lnk
from helpers import *

class S3HoverboardAlert:
    def __init__(self):
        self.filters = {
            "hoverboard-syphon-imps-v2": "imps-flume",
            "hoverboard-events": "visits-flume",
            "hoverboard-conv": "conversions-flume"
        }

        self.filter_key = {
            "imps-flume": "hoverboard-syphon-imps-v2",
            "visits-flume": "hoverboard-events",
            "conversions-flume": "hoverboard-conv"
            }
        
        self.default_times = {
            "hotsy_totsy": 5,
            "gazelle": 5
            }
        
        self.MESSAGE = (
            "*WARNING*: Data has not been written to the `%s` S3 bucket for at "
            "least 2 hours for the following advertisers: `%s`. You should check "
            "https://console.aws.amazon.com/s3/home?region=us-east-1#&bucket=%s to confirm."
            )

        self.m = lnk.api.marathon
        self.sc = get_slack()
        self.conn = get_s3()

        self.active_apps = self.get_active_apps()
        self.apps = self.get_broken_apps()
        self.send_alerts()


    def get_source(self, filename):
        bucket, path = str(filename).split(",")
        path_list = path.split('/')
        for directory in path_list:
            if "source" in directory:
                return directory.split("=")[1]
        return None

    def check_directory(self, d, filter_name):
        filename = str(d)
        last_modified = d.last_modified
        source = self.get_source(filename)

        if source in self.default_times:
            hours = self.default_times[source]
        else:
            hours = 2

        # If the time since last write is less than the specified number of
        # hours, remove the app from the apps list
        if time_since(last_modified, kind="hours") < hours:
            if source in self.active_apps[filter_name]:
                self.active_apps[filter_name].remove(source)

    def get_active_apps(self):
        # Get the list of advertisers set up with the new hoverboard process 
        # using the Marathon API
        apps = self.m.get("/v2/apps").json["apps"]

        active_apps = {}
        for f in self.filters.values():
            filter_app_ids = [app["id"].split("/")[3:]
                              for app in apps
                              if "filter/%s" % f in app["id"] and app["tasksRunning"] > 0]
            sources = set([l[0].replace("-","_") for l in filter_app_ids if l])
            active_apps[f] = sources
        return active_apps

    def get_broken_apps(self):
        sources = {}

        # For each bucket
        for b in self.filters:
            bucket = self.conn.get_bucket(b)
            filter_name = self.filters[bucket.name]
            for directory in bucket.list():
                self.check_directory(directory, filter_name)

    def send_alerts(self):
        for app,advertisers in self.active_apps.iteritems():
            bucket = self.filter_key[app]
            if advertisers:
                m = MESSAGE % (bucket, ', '.join(advertisers), bucket)
                sc.api_call("chat.postMessage", channel="#production-alerts", text=m)

s = S3HoverboardAlert()
