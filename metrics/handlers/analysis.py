import tornado.web
import ujson
import pandas as pd
import StringIO
import json

from base import BaseHandler

from twisted.internet import defer
from lib.hive.helpers import run_hive_session_deferred
from lib.helpers import *
from lib.query.MYSQL import *
from lib.query.HIVE import *

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

    def pull_segments_list(self):
        '''Returns a DataFrame representing all segments along with their advertiser_id and name'''
        segments = self.db.select_dataframe(SEGMENTS_LIST)
        return segments
    
    def construct_dmas_query(self, from_date, to_date, segments):
        '''Given a list of segments (strings), returns a query that will return the data about each DMA visited by 
        users of that segment.'''

        segment_list = ["array_contains(segments, '{}')".format(segment) for segment in segments] 
        where = ' OR '.join(segment_list)
        where += ' AND date >= "{}" and date <= "{}" '.format(from_date, to_date)
        
        query = SEGMENTS_DMAS.format(where)

        return query

    def construct_domains_query(self, from_date, to_date, segments):
        '''Given a list of segments (strings), returns a DataFrame containing data about each domain visited by users of that
        segment. Note that low-volume domains are automatically aggregated into the "OTHER" category, and will appear as such
        within the DataFrame. Results may be weighted by using the "weighted" parameter.'''

        segment_list = ["array_contains(segments, '{}')".format(segment) for segment in segments] 
        where = ' OR '.join(segment_list)
        where += ' AND date >= "{}" and date <= "{}" '.format(from_date, to_date)
        segment_query = SEGMENTS_DOMAINS.format(where)

        pop_query = AGG_POP_DOMAINS

        print segment_query
        print pop_query
        return (segment_query, pop_query)

    def format_domains_results(self, df, population):
        population['percent_imps'] = population.num_users.astype(float) / sum(population.num_users.astype(float))
        population_domains = population.set_index("domain")

        df['percent_imps'] = df.num_imps.astype(float) / sum(df.num_imps.astype(float))
        segment_domains = df.set_index("domain")
        segment_domains.insert(0, 'weighted_imps',(segment_domains.percent_imps - population_domains.percent_imps).order(ascending=False))
        segment_domains = pd.DataFrame(segment_domains).dropna()
        segment_domains.insert(0, 'weighted_rank (by user count)', range(1, len(segment_domains) + 1))
        segment_domains.insert(0, "domain", segment_domains.index.tolist())
        segment_domains.reset_index(drop=True, inplace=True)
        del segment_domains['weighted_imps']
        del segment_domains['percent_imps']

        return segment_domains

    @decorators.formattable
    def domains_callback(self, data, population):
        data = self.format_domains_results(data, population)

        if not self.get_argument("format", False):
            data = data.to_html(index=False)

        def default(self, data):
            self.render(template, stuff=data)

        yield default, (data,)        

    @decorators.formattable
    def get_content(self, data):
        if not self.get_argument("format", False):
            data = data.to_html(index=False)

        def default(self, data):
            self.render("analysis/_segments.html", stuff=data)

        yield default, (data,)        

    @defer.inlineCallbacks
    def execute_query(self, query):
        data = yield run_hive_session_deferred(self.hive, ["set shark.map.tasks=32", "set mapred.reduce.tasks=3",query])
        df = pd.DataFrame(data)
        self.get_content(df)

    @defer.inlineCallbacks
    def execute_domains_query(self, segments_query, pop_query):
        print pop_query
        print segments_query
        segments_data = yield run_hive_session_deferred(self.hive, ["set shark.map.tasks=32", "set mapred.reduce.tasks=3",segments_query])
        pop_data = yield run_hive_session_deferred(self.hive, ["set shark.map.tasks=32", "set mapred.reduce.tasks=3",pop_query])

        segments_df = pd.DataFrame(segments_data)
        pop_df = pd.DataFrame(pop_data)
     
        df = self.format_domains_results(segments_df, pop_df)
        self.get_content(df)

    @decorators.formattable
    def get(self):
        data = self.pull_segments_list()
        self.render("analysis/_segments.html", stuff=data.to_html(index=False))

    @tornado.web.asynchronous
    def post(self):
        from_date = self.get_argument("from_date")
        to_date = self.get_argument("to_date")
        group_by = self.get_argument("group_by")
        segments = self.get_argument("segments")

        # Split comma-separated segments into list
        segments = [item.strip() for item in segments.split(',')]

        print segments
        if group_by == "domain":
            template = "analysis/_segment_domain.html"
            queries = self.construct_domains_query(from_date, to_date, segments)
            print queries
            self.execute_domains_query(queries[0], queries[1])

        elif group_by == "dma":
            template = "analysis/_segment_dma.html"
            query = self.construct_dmas_query(from_date, to_date, segments)
            self.execute_query(query)

        
