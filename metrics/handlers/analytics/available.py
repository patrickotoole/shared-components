import tornado.web
import ujson
import pandas
import StringIO
import logging

from ..base import BaseHandler
from twisted.internet import defer
from lib.helpers import decorators

QUERY = "SELECT * from rockerbox.domain_tag_imps "

class AvailabilityHandler(BaseHandler):
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.db = db
        self.cassandra = cassandra

    @decorators.deferred
    def defer_get_availability(self, tag_id, sellers, domains):
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

        return df

    @defer.inlineCallbacks
    def get_availability(self, tag_id, sellers, domains):
        df = yield self.defer_get_availability(tag_id, sellers, domains)
        if len(df):
            df['ecp'] = df.ecp / df.imps / 1000
            df['eap'] = df.eap / df.imps / 1000

        availability_list = df.T.to_dict().values()
        self.write(ujson.dumps(availability_list))
        self.finish()

    @tornado.web.asynchronous
    def get(self):
        self.get_availability(
            self.get_arguments("tag", []),
            self.get_arguments("seller",[]),
            self.get_arguments("domain",[])
        )
