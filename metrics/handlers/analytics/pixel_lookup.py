import tornado.web
import ujson
import pandas
import StringIO
import logging

from ..base import BaseHandler
from analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

QUERY = "SELECT * FROM rockerbox.pixel_fires"

class PixelLookupHandler(AnalyticsBase, BaseHandler):
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.db = db
        self.cassandra = cassandra
        self.logging = logging

    def write_json(self, data):
        self.write(ujson.dumps(data))
        self.finish()

    @defer.inlineCallbacks
    def get_segments(self, advertiser, segment, uid):
        df = yield self.defer_execute(advertiser, segment, uid)
        response = self.format_response(df)
        self.write_json(response)

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

        self.logging.info(q)
        data = self.cassandra.execute(q)
        return pandas.DataFrame(data)

    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        advertiser = self.get_argument("advertiser", False)
        segment = self.get_argument("segment", False)
        uid = self.get_argument("uid", False)

        self.get_segments(advertiser, segment, uid)
