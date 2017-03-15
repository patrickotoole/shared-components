import tornado.web
import ujson
import pandas
import StringIO
import logging

from lib.cassandra_helpers.future_statement import *
from handlers.base import BaseHandler
from handlers.analytics.analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers

QUERY = "SELECT * FROM rockerbox.pixel_fires_v2"

class PixelLookupHandler(AnalyticsBase, BaseHandler):
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.db = db
        self.cassandra = cassandra
        self.logging = logging

    def write_json(self, data):
        self.write(ujson.dumps(data))
        self.finish()

    PREPPED = {}

    def prepare_query(self,query):

        prepped_executor = self.PREPPED.get(query,False)

        if prepped_executor:
            return prepped_executor

        statement = self.cassandra.prepare(query)

        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)

        self.PREPPED[query] = execute

        return execute

    @defer.inlineCallbacks
    def get_segments(self, advertiser, segment, uid):
        try:
            if uid:
                df = yield self.defer_execute(advertiser, segment, uid)
            else:
                df = yield self.get_from_v2(advertiser,segment)
            response = self.format_response(df)
            self.write_json(response)
        except:
            self.write("{}")
            self.finish()

    def format_response(self, df):
        if len(df) == 0:
            return []

        df["segment_id"] = df.segment
        df["advertiser"] = df.source

        # grouped = df.groupby("source")
        # df =  grouped.apply(lambda x: Convert.df_to_values(x[["last_fired", "segment_id"]]))
        return Convert.df_to_values(df)
        
    @decorators.deferred
    def defer_execute(self, advertiser, segment, uid):
        where = []
        q = QUERY

        if advertiser:
            where.append("source = '%s'" % advertiser)
        if segment:
            where.append("segment = '%s'" % segment)
        if uid:
            where.append("uid = '%s'" % uid)
        if where:
            where = " WHERE " + ' and '.join(where)
            q = QUERY + where

        q = q + " LIMIT 5000"
        self.logging.info(q)
        data = self.cassandra.execute(q)
        return pandas.DataFrame(data)

    def get_from_v2(self,source,segment):
        query = QUERY + " where source = ? and segment = ? and u2 = ?"
        execute = self.prepare_query(query)
        if segment:
            prepped = [[source, str(segment)] + [str(u2)] for u2 in range(0,100)]
            data, _ = FutureHelpers.future_queue(prepped,execute,simple_append,60,[],None)
        else:
            data = []
        return data 

    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        advertiser = self.get_argument("advertiser", False)
        segment = self.get_argument("segment", False)
        uid = self.get_argument("uid", False)

        self.get_segments(advertiser, segment, uid)
