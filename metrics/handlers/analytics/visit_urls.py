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

QUERY = "SELECT * FROM rockerbox.visit_urls "

class VisitUrlsHandler(BaseHandler):
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.db = db
        self.cassandra = cassandra
        self.limit = None
        self.query = QUERY

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.render("analysis/timeseries.html", data=df)
        yield default, (data,)


    @defer.inlineCallbacks
    def get_urls(self, source):
        df = yield self.defer_get_urls(source)

        self.get_content(df)

    @decorators.deferred
    def defer_get_urls(self, source):
        where = []

        if source:
            where.append(" source = '{}'".format(source[0]))
        else:
            raise Exception("Must specify source using source=")

        WHERE = "where " + " and ".join(where)
        QUERY = self.query + WHERE 

        # DEV: NEED TO REMOVE THE BELOW 
        #QUERY = QUERY + " limit 100"
        logging.info(QUERY)

        
        


        df = pandas.DataFrame(self.cassandra.execute(QUERY,None,60))
        df['source'] = df.source.map(lambda x: x.encode('utf-8'))
        df['url'] = df.url.map(lambda x: x.encode('utf-8'))

        return df

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)

        if formatted:
            self.get_urls(
                #self.get_arguments("source", [])
                [self.current_advertiser_name]
            )
        else:
            self.get_content(pandas.DataFrame())
