import tornado.web
import ujson
import pandas
import StringIO
import logging

from ..base import BaseHandler
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

QUERY = "SELECT * from rockerbox.domain_tag_imps "

class AvailabilityHandler(BaseHandler):
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.db = db
        self.cassandra = cassandra

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
        Q = QUERY
        if len(domains):
            where.append(" domain in ('" + "','".join(domains) + "')")

        if len(tag_id):
            where.append(" tag = '{}'".format(tag_id[0]))

        WHERE = "where " + " and ".join(where)
        logging.info(Q + WHERE)
        df = self.cassandra.select_dataframe(Q + WHERE )

        if len(sellers) and len(df):
            return df[df['seller'].isin(sellers)]

        if len(sizes) and len(df):
            return df[df['size'].isin(sizes)]

        return df


    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        
        if formatted:
            self.get_availability(
                self.get_arguments("tag", []),
                self.get_arguments("seller",[]),
                self.get_arguments("size",[]),
                self.get_arguments("domain",[])
            )
        else:
            self.get_content(pandas.DataFrame())
