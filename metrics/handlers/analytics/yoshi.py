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

QUERY = "SELECT * FROM rockerbox.yoshi_imps "

class YoshiHandler(BaseHandler, AnalyticsBase):

    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None
        self.query = QUERY

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            j = Convert.df_to_json(data)
            self.write(j)
            self.finish()
        yield default, (data,)

    def cassandra_get_yoshi(self):
        domain = self.get_argument("domain",False)
        where = ""
        if domain:
            where = "WHERE domain = '%s'" % domain

        return self.cassandra.execute(self.query + where)

    @decorators.deferred
    def defer_get_yoshi(self):

        data = self.cassandra_get_yoshi()
        df = pandas.DataFrame(data)

        return df

    @defer.inlineCallbacks
    def get_yoshi(self):
        df = yield self.defer_get_yoshi()
        self.get_content(df)

    @tornado.web.asynchronous
    def get(self):
        self.get_yoshi()

