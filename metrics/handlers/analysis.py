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
from lib.query import *

class AnalysisHandler(BaseHandler):
    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

    def get_segment_name(self, segment_id):
        '''Given a segment id, return the name associated with that id'''
        segment_name_query = "select segment_name from advertiser_segment where external_segment_id={}".format(segment_id)
        segment_name = self.db.select_dataframe(segment_name_query)
        return segment_name['segment_name'][0]

    def pull_segments_domains(self, segments, weighted=True):
        '''Given a list of segments (strings), returns a DataFrame containing data about each domain visited by users of that
        segment. Note that low-volume domains are automatically aggregated into the "OTHER" category, and will appear as such
        within the DataFrame. Results may be weighted by using the "weighted" parameter.

        Parameters
        ---
        segments (list of strings)
        weighted (boolean, default: True) - If True, provides a weighted ranking and weighted user percentage based on the
                                            current population. This should be used for most cases.
        '''
        segment_list = ["array_contains(segments, '{}')".format(segment) for segment in segments] 
        where = ' OR '.join(segment_list)
        segment_query = SEGMENTS_DOMAINS.format(where)
        print segment_query
        segment_df = pd.DataFrame(self.hive.session_execute(["set shark.map.tasks=32", "set mapred.reduce.tasks=3", segment_query]))
        
        if weighted:
            population_df = pd.DataFrame(self.hive.session_execute(["set shark.map.tasks=32", 
                                                                    "set mapred.reduce.tasks=3",
                                                                     AGG_POP_DOMAINS]))

            print segment_query
            population_df['percent_imps'] = population_df.num_users.astype(float) / sum(population_df.num_users.astype(float))
            population_domains = population_df.set_index("domain")

            segment_df['percent_imps'] = segment_df.num_imps.astype(float) / sum(segment_df.num_imps.astype(float))
            segment_domains = segment_df.set_index("domain")
            segment_domains.insert(0, 'weighted_imps',(segment_domains.percent_imps - population_domains.percent_imps).order(ascending=False))
            segment_domains = pd.DataFrame(segment_domains).dropna()
            segment_domains.insert(0, 'weighted_rank (by user count)', range(1, len(segment_domains) + 1))
            segment_domains.insert(0, "domain", segment_domains.index.tolist())
            segment_domains.reset_index(drop=True, inplace=True)
            del segment_domains['weighted_imps']
            del segment_domains['percent_imps']
            result_data = segment_domains
        else:
            result_data = segment_df
        
        return result_data

    def pull_segments_list(self):
        '''Returns a DataFrame representing all segments along with their advertiser_id and name'''
        segments = self.db.select_dataframe(SEGMENTS_LIST)
        return segments

    def pull_partitions(self, table_name):
        '''Returns a DataFrame representing the partitions currently available in the table with given table_name'''
        partitions = pd.DataFrame(self.hive.execute("show partitions {}".format(table_name)))
        return partition
    
    def pull_segments_dmas(self, segments, weighted=True):
        '''Given a list of segments (strings), returns a DataFrame containing data about each DMA visited by users of that
        segment. 

        Parameters
        ---
        segments (list of strings)
        weighted (boolean, default: True) - If True, provides a weighted ranking and weighted user percentage based on the
                                            current population. This should be used for most cases.
        '''

        segment_list = ["array_contains(segments, '{}')".format(segment) for segment in segments] 
        where = ' OR '.join(segment_list)
        segment_query = SEGMENTS_DMAS.format(where)
        segment_df = pd.DataFrame(self.hive.session_execute(["set shark.map.tasks=32", "set mapred.reduce.tasks=3", segment_query]))

        return segment_df

    def pull_domains(self, domain_list):
        '''Given a list of domains, return a DataFrame summarizing the number of imps, pages, and users by date/hour'''
        domain_list = ["domain=\""+domain+"\"" for domain in domain_list]
        where = ' OR '.join(domain_list)

        imps_query = ["set shark.map.tasks = 54", "set mapred.reduce.tasks = 10", 
                      IMPS_DOMAINS.format(where)]
        auctions_query = ["set shark.map.tasks = 54", "set mapred.reduce.tasks = 10", APPROVED_DOMAINS.format(where)]

        imps_data = pd.DataFrame(self.hive.session_execute(imps_query))
        auctions_data = pd.DataFrame(self.hive.session_execute(auctions_query))

        imps_data = imps_data.set_index(['date','hour','domain']).sort()
        auctions_data = auctions_data.set_index(['date','hour','domain']).sort()

        result_data = imps_data.join(auctions_data, on=("date","domain","hour")).sort().dropna()

        return result_data


    def pull_log_volume(self, logs, groupby="type,date,hour", seller=True):
        log_list = ["type=\""+log+"\"" for log in logs]

        select = "type,date,hour"
        where = ' OR '.join(log_list)

        if seller:
            select+= ",seller"
            groupby+=",seller"

        log_query = ["set shark.map.tasks = 32", "set mapred.reduce.tasks = 3", APPROVED_TYPE_SELLER.format(where, groupby)]

        '''Given a log name, returns a summary of approved volume for that domain list'''
        log_data = pd.DataFrame(self.hive.session_execute(log_query))
        return log_data
    
    @decorators.formattable
    def get(self):
        name = "Domains"
        domains = self.get_arguments("domain")
        segments = self.get_arguments("segment")
        logs = self.get_arguments("log")
        query = self.get_argument("query", False)
        dim = self.get_argument("dim", False)

        if self.get_argument("query", False):
            segments = [item.strip() for item in query.split(',')]
            name = [self.get_segment_name(segment) for segment in segments]
            if dim == "domain":
                template = "analysis/_segment_domain.html"
                data = self.pull_segments_domains(segments).to_html(index=False)
            elif dim == "dma":
                template = "analysis/_segment_dma.html"
                data = self.pull_segments_dmas(segments).to_html(index=False)

        elif self.get_argument("format", False):
            if domains:
                name = domains
                data = self.pull_domains(domains)
            elif segments:
                name = [self.get_segment_name(segment) for segment in segments]
                data = self.pull_segments_domains(segments)
            elif logs:
                name = logs
                data = self.pull_log_volume(logs)
            else:
                name = "Segments"
                data = self.pull_segments_list()
        else:
            if domains:
                name = domains
                data = self.pull_domains(domains).to_html()
            elif segments:
                name = [self.get_segment_name(segment) for segment in segments]
                data = self.pull_segments_domains(segments).to_html(index=False, index_names=False)
            elif logs:
                name = logs
                data = self.pull_log_volume(logs).to_html(index=False)
            else:
                name = "Segments"
                data = self.pull_segments_list().to_html(index=False)

        def default(self, data):
            if domains:
                self.render("analysis/_domains.html", stuff=data, name=name)
            elif segments:
                self.render(template, stuff=data, name=name)
            elif logs:
                self.render("analysis/_log.html", stuff=data, name=name)
            else:
                self.render("analysis/_segments.html", stuff=data, name=name)

        yield default, (data,)

    def post(self):
        pass
    
