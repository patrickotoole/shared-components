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
        segment_query = '''select domain,sum(num_unique_users) AS num_users, sum(num_unique_pages) AS num_pages, avg(unique_pages_per_user) AS pages_per_user FROM agg_domain_imps WHERE array_contains(segments, '{}') GROUP BY domain ORDER BY num_users DESC'''.format(segment)
        segment_data = pd.DataFrame(self.hive.session_execute(["set shark.map.tasks=32", "set mapred.reduce.tasks=3", segment_query]))

        return segment_data

    def pull_segments_list(self):
        segments = self.db.select_dataframe("select external_advertiser_id,segment_name,external_segment_id from advertiser_segment inner join advertiser using (external_advertiser_id)")
        return segments

    def pull_agg_partitions(self):
        partitions = pd.DataFrame(self.hive.execute("show partitions agg_domain_imps"))
        return partitions

    # Given a list of domains, return a DataFrame summarizing the number of imps, pages, and users by date/hour
    def pull_domains(self, domain_list):
        print domain_list

        domain_list = ["domain=\""+domain+"\"" for domain in domain_list]

        where = 'OR '.join(domain_list)

        print domain_list
            
        data = pd.DataFrame(self.hive.session_execute(["set shark.map.tasks = 32", "set mapred.reduce.tasks = 3", "SELECT domain, date, hour, sum(num_imps) AS imps FROM agg_domain_imps WHERE {} GROUP BY date,hour,domain".format(where)]))
        return data

    
    @decorators.formattable
    def get(self):
        name = "Domains"
        df_type = self.get_argument("type", default=False)
        domains = self.get_arguments("domain")
        segment = self.get_argument("segment", default=False)
        segments = self.get_argument("segments", default=False)

        if self.get_argument("format", False):
            if domains:
                name = domains
                data = self.pull_domains(domains)
            elif segments:
                name = "Segments"
                data = self.pull_segments_list()
            elif segment:
                name = self.get_segment_name(segment)
                data = self.pull_segment(segment)
        else:
            if domains:
                name = domains
                data = self.pull_domains(domains).to_html()
            elif segments:
                name = "Segments"
                data = self.pull_segments_list().to_html()
            elif segment:
                name = self.get_segment_name(segment)
                data = self.pull_segment(segment).to_html()

        def default(self, data):
            if domains:
                self.render("analysis/_domains.html", stuff=data, name=name)
            elif segments:
                self.render("analysis/_segments.html", stuff=data, name=name)
            elif segment:
                self.render("analysis/_segment.html", stuff=data, name=name)

        yield default, (data,)

    def post(self):
        pass
    
