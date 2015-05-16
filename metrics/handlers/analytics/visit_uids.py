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

DEFAULT_INTERVAL = "minute"

QUERY = "SELECT * FROM rockerbox.visit_uids_2 "

class VisitUidsHandler(BaseHandler, AnalyticsBase):
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None
        self.query = QUERY

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.render("analysis/visit_urls.html", data=df)
        yield default, (data,)


    @defer.inlineCallbacks
    def get_uids(self, url, date_clause):
        df = yield self.defer_get_uids(url, date_clause)
        self.get_content(df)

    @decorators.deferred
    def defer_get_uids(self, url, date_clause):
        where = []

        if not url:
            raise Exception("Must specify url using url=")

        urls = url.split(",")
        data = []

        # df = pandas.DataFrame(self.get_w_futures(urls))
        df = pandas.DataFrame(self.get_w_in(urls, date_clause))

        return df

    def get_w_in(self, urls, date_clause):
        where = 'where url IN {}'
        if date_clause:
            where = where + " and {}".format(date_clause)
        in_clause = self.make_in_clause(urls)
        WHERE = where.format(in_clause)
        logging.info(self.query + WHERE)
        return self.cassandra.execute(self.query + WHERE)

    def get_w_futures(self, urls):
        queries = []

        for u in urls:
            print u
            where = "url = '{}'".format(u)
            WHERE = "where " + where
        
            queries.append(self.query + WHERE)
        
        return self.batch_execute(queries)

    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        url = self.get_argument("url", [])
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")

        date_clause = self.make_date_clause("timestamp", date, start_date, end_date)

        if formatted:
            self.get_uids(
                url,
                date_clause
            )
        else:
            self.get_content(pandas.DataFrame())
