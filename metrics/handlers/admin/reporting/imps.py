import tornado.web
import ujson
import pandas as pd
import StringIO
import json

from twisted.internet import defer
from lib.hive.helpers import run_spark_sql_session_deferred
from lib.helpers import *
from lib.query.MYSQL import *
from lib.query.HIVE import *

class ImpsReportingHandler(tornado.web.RequestHandler):
    def initialize(self, db=None, api=None, hive=None, spark_sql=None):
        self.db = db 
        self.api = api
        self.hive = hive
        self.spark_sql = spark_sql
    
    def construct_dmas_query(self, from_date, to_date, segments):
        '''Given a list of segments (strings), returns a query that will
        return the data about each DMA visited by users of that segment.'''

        segment_list = ["array_contains(segments, '{}')".format(segment) for segment in segments] 
        where = ' OR '.join(segment_list)
        where += ' AND date >= "{}" and date <= "{}" '.format(from_date, to_date)
        
        query = SEGMENTS_DMAS.format(where)

        return query

    def construct_domains_query(self, from_date, to_date, segments):
        '''Given a list of segments (strings), returns a DataFrame containing 
        data about each domain visited by users of that segment. Note that 
        low-volume domains are automatically aggregated into the "OTHER" 
        category, and will appear as such within the DataFrame. Results may 
        be weighted by using the "weighted" parameter.'''

        segment_list = ["array_contains(segments, '{}')".format(segment) for segment in segments] 
        where = ' OR '.join(segment_list)
        where += ' AND date >= "{}" and date <= "{}" '.format(from_date, to_date)
        segment_query = SEGMENTS_DOMAINS.format(where)

        pop_query = AGG_POP_DOMAINS

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
    def get_content(self, data):
        if not self.get_argument("format", False):
            data = data.to_html(index=False)

        def default(self, data):
            self.render("admin/_imps.html", stuff=data)

        yield default, (data,)        

    @defer.inlineCallbacks
    def execute_dmas_query(self, query):
        q = [ "set shark.map.tasks=32", "set mapred.reduce.tasks=3", query]
        data = yield run_spark_sql_session_deferred(self.hive, q)
        df = pd.DataFrame(data)
        self.get_content(df)

    @defer.inlineCallbacks
    def execute_domains_query(self, segments_query, pop_query):
        segments_q = [
            "SET spark.sql.shuffle.partitions=8",
            segments_query
        ]

        pop_q = [
            "SET spark.sql.shuffle.partitions=8",
            pop_query
        ]
            
        segments_data = yield run_spark_sql_session_deferred(self.spark_sql, segments_q)
        pop_data = yield run_spark_sql_session_deferred(self.spark_sql, pop_q)

        segments_df = pd.DataFrame(segments_data)
        pop_df = pd.DataFrame(pop_data)
     
        df = self.format_domains_results(segments_df, pop_df)
        self.get_content(df)

    @tornado.web.asynchronous
    def get(self):
        from_date = self.get_argument("from_date")
        to_date = self.get_argument("to_date")
        group_by = self.get_argument("group_by")
        segments = self.get_argument("segments")

        # Split comma-separated segments into list
        segments = [item.strip() for item in segments.split(',')]

        if group_by == "domain":
            queries = self.construct_domains_query(from_date, to_date, segments)
            self.execute_domains_query(queries[0], queries[1])

        elif group_by == "dma":
            query = self.construct_dmas_query(from_date, to_date, segments)
            self.execute_dmas_query(query)
        
