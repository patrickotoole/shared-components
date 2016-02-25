import tornado.web
import ujson
import pandas
import StringIO
import logging

import re

from handlers.base import BaseHandler
from handlers.analytics.analytics_base import AnalyticsBase
from link import lnk
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *
from lib.helpers import APIHelpers

QUERY1 = "select distinct * from uids_only_sessions_cache where advertiser = '{}' and pattern = '{}'"
QUERY2 = "select distinct * from uids_only_visits_cache where advertiser = '{}' and pattern = '{}'"

class UidsCacheHandler(BaseHandler, AnalyticsBase, APIHelpers):

    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.render("analysis/visit_urls.html", data=df)
        yield default, (data,)

    @decorators.deferred
    def defer_get_uids_cache(self, advertiser, pattern):

        sql = lnk.dbs.rockerbox

        results1 = sql.select_dataframe(QUERY1.format(advertiser, pattern))
        results2 = sql.select_dataframe(QUERY2.format(advertiser, pattern))
        df = {"sessions":
        ujson.loads(pandas.DataFrame(results1)[["num_sessions","sessions_user_count"]].to_json(orient='records')),"visits":ujson.loads(pandas.DataFrame(results2)[["num_visits","visit_user_count"]].to_json(orient='records'))}
        temp = results1.set_index("num_sessions").to_dict()
        return df

    @defer.inlineCallbacks
    def get_cache_uids(self, advertiser, pattern):
        response_data = yield self.defer_get_uids_cache( advertiser, pattern)
        self.write_response(response_data)
        #self.get_content(response_data)
    
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        url_pattern = self.get_argument("url_pattern", "")
        user = self.current_advertiser_name

        try:
            self.get_cache_uids(
                user,
                url_pattern
                )
        except:
            self.get_content(pandas.DataFrame())
