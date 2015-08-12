import tornado.web
import ujson
import pandas
import StringIO
import logging
import pretty
from datetime import datetime

from handlers.base import BaseHandler
from handlers.analytics.analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.mysql.helpers import *

QUERY = "SELECT * FROM rockerbox.source_segment_timestamp"
MYSQL_QUERY = """
SELECT segment_name, cast(external_segment_id AS CHAR) as segment 
FROM rockerbox.advertiser_segment
"""

class PixelStatusHandler(AnalyticsBase, BaseHandler):
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.db = db
        self.cassandra = cassandra
        self.logging = logging

    def write_json(self, data):
        self.write(ujson.dumps(data))
        self.finish()

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            html = data.to_html(classes=["dataframe"])
            self.render("admin/logins.html", data=html)
        yield default, (data,)

    @defer.inlineCallbacks
    def get_segments(self, advertiser, segment):
        df = yield self.defer_execute(advertiser, segment)
        extras = yield run_mysql_deferred(self.db, MYSQL_QUERY)

        df = df.set_index("segment").join(extras.set_index("segment")).reset_index()
        response = self.format_response(df)
        self.get_content(response)

    def pretty_timestamp(self, timestamp, format_str="%Y-%m-%d %H:%M:%S"):
        now = datetime.now()
        ts = datetime.strptime(timestamp, format_str)
        delta = now - ts
        return pretty.date(now - delta)

    def seconds_since(self, timestamp, format_str="%Y-%m-%d %H:%M:%S"):
        now = datetime.now()
        ts = datetime.strptime(timestamp, format_str)
        delta = now - ts
        return delta.seconds
        
    def format_response(self, df):
        if len(df) == 0:
            return []

        df["last_fired"] = df.timestamp
        df["segment_id"] = df.segment
        df["advertiser"] = df.source

        df["last_fired_pretty"] = df.timestamp.apply(lambda x: self.pretty_timestamp(x))
        df["last_fired_seconds"] = df.timestamp.apply(lambda x: self.seconds_since(x))
        cols = [
            "advertiser",
            "segment_name", 
            "segment_id",
            "last_fired", 
            "last_fired_pretty",
            "last_fired_seconds"
        ]
        
        df = df[cols]

        # grouped = df.groupby("source")
        # df =  grouped.apply(lambda x: Convert.df_to_values(x[["last_fired", "segment_id"]]))
        return df
        
    @decorators.deferred
    def defer_execute(self, advertiser, segment):
        where = []
        q = QUERY

        if advertiser:
            where.append("source = '%s'" % advertiser)
        if segment:
            where.append("segment = '%s'" % segment)
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

        self.get_segments(advertiser, segment)
