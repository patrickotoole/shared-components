import tornado.web
import ujson
import pandas
import StringIO
import logging

from ..base import BaseHandler
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

DEFAULT_INTERVAL = "minute"

QUERIES = {
    "minute": [
        "SELECT * from rockerbox.domain_tag_imps ",
        "SELECT * from rockerbox.domain_tag_imps_2 "
    ],
    "15_minute": [
        "SELECT * FROM rockerbox.domain_tag_imps_quarter_hourly ",
        "SELECT * FROM rockerbox.domain_tag_imps_quarter_hourly_2 "
    ]
}

class AvailabilityHandler(BaseHandler):
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.db = db
        self.cassandra = cassandra
        self.limit = None
        self.queries = QUERIES[DEFAULT_INTERVAL]

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.render("analysis/timeseries.html", data=df)
        yield default, (data,)


    @defer.inlineCallbacks
    def get_availability(self, tag_id, sellers, sizes, domains):
        df = yield self.defer_get_availability(tag_id, sellers, sizes, domains)
        if len(df):
            df['ecp'] = df.ecp / df.imps / 1000
            df['eap'] = df.eap / df.imps / 1000

        self.get_content(df)

    @decorators.deferred
    def defer_get_availability(self, tag_id, sellers, sizes, domains):
        where = []

        if len(domains):
            where.append(" domain in ('" + "','".join(domains) + "')")

        if len(tag_id):
            where.append(" tag = '{}'".format(tag_id[0]))

        WHERE = "where " + " and ".join(where)

        for query in self.queries:
            logging.info(query + WHERE)

        df_a = self.cassandra.select_dataframe(self.queries[0] + WHERE)
        df_b = self.cassandra.select_dataframe(self.queries[1] + WHERE)

        df = self.combine(df_a, df_b)

        if len(sellers) and len(df):
            df = df[df['seller'].isin(sellers)]

        if len(sizes) and len(df):
            df = df[df['size'].isin(sizes)]

        return df

    def combine(self, df_a, df_b):
        df = df_a.append(df_b)
        df = df.groupby(["domain", "tag", "seller", "size", "timestamp"])
        df = df.sum().reset_index()

        min_timestamp = df.reset_index().timestamp.min()
        max_timestamp = df.reset_index().timestamp.max()

        df = df[(df.timestamp != max_timestamp) & (df.timestamp != min_timestamp)]

        return df

    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        interval = self.get_argument("interval", False)
        limit = self.get_argument("limit", False)

        if interval:
            self.queries = QUERIES[interval]

        if formatted:
            self.get_availability(
                self.get_arguments("tag", []),
                self.get_arguments("seller",[]),
                self.get_arguments("size",[]),
                self.get_arguments("domain",[])
            )
        else:
            self.get_content(pandas.DataFrame())
