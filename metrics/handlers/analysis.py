import tornado.web
import ujson
import pandas as pd
import StringIO
import json
import os
import time
import vincent
from base import BaseHandler
from lib.helpers import *

class PixelAnalysisHandler(BaseHandler):
    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

    def load_df(self, directory="/root/projects/rockerbox-datascience/data/web/"):
        df = dict()
        for filename in os.listdir("/root/projects/rockerbox-datascience/data/web/"):
            with open(directory+filename, 'r') as json_file:
                data = json_file.read()
                df[filename.replace('.json','')] = pd.read_json(data)
        return df

    def get_segment_name(self, segment_id):
        segment_name_query = "select segment_name from advertiser_segment where external_segment_id={}".format(segment_id)
        segment_name = self.db.select_dataframe(segment_name_query)
        return segment_name['segment_name'][0]

    def pull_segment(self, segment):
        segment_query = "select domain, sum(num_unique_users) AS num_users, sum(num_unique_pages) AS num_pages, avg(unique_pages_per_user) AS pages_per_user FROM agg_domain_imps WHERE array_contains(segments, '{}') GROUP BY domain ORDER BY num_users DESC".format(segment)
        segment_data = pd.DataFrame(self.hive.execute(segment_query))

        return segment_data

    def pull_segments_list(self):
        segments = self.db.select_dataframe("select external_advertiser_id,segment_name,external_segment_id from advertiser_segment inner join advertiser using (external_advertiser_id)")
        return segments


    def pull_agg_partitions(self):
        partitions = pd.DataFrame(self.hive.execute("show partitions agg_domain_imps"))
        return partitions


    def pull_pixel(self, df_name):
        df_name = df_name.replace("pixel_","")
        self.df = self.load_df()
        return self.df[df_name]

    def pull_domain(self, domain_name):
        # Get imp counts for each hour
        data = pd.DataFrame(self.hive.execute("SELECT date, hour, sum(num_imps) AS imps FROM agg_domain WHERE domain='{}' AND date='14-07-10' AND hour>='04' AND hour <='10' GROUP BY date,hour".format(domain_name)))
        return data

    def pull_timeline(self):
        data = pd.DataFrame(self.hive.execute("SELECT date, hour, sum(num_imps) AS imps FROM agg_domain GROUP BY date,hour"))
        return data

    def get(self):
        name = "Domains"
        df_type = self.get_argument("type", default=False)
        domain = self.get_argument("domain", default=False)

        if df_type:
            if "pixel_" in df_type:
                data = self.pull_pixel(df_type)
            elif df_type == "imps_by_domain":
                data = pd.DataFrame(self.hive.execute("select domain, sum(num_imps) AS imps, sum(num_unique_pages) AS pages, sum(num_unique_users) as users, avg(unique_pages_per_user) AS ppu from agg_domain_imps group by domain order by imps DESC limit 100"))
            elif df_type == "segment_domains":
                segments = self.pull_segments_list()
                
                # Check if a segment id was passed
                segment = self.get_argument("segment", default=False)

                if segment:
                    name = self.get_segment_name(segment)
                    print name
                    data = self.pull_segment(segment)

                else:
                    name = "Segments"
                    data = segments

            elif df_type == "imps_by_datetime":
                data = self.pull_timeline()
            else:
                data = None
        elif domain:
            data = self.pull_domain(domain)
        else:
            data = self.pull_agg_partitions()

        if not data.empty:
            self.render("analysis/_analysis.html", stuff=data.to_html(), name=name)
        else:
            self.render("analysis/_analysis.html", stuff=None, name=name)
        

    def post(self):
        pass
    
