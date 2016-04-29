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
import lib.custom_defer as custom_defer

QUERY1 = "select distinct * from uids_only_sessions_cache where advertiser = '{}' and pattern = '{}'"
QUERY2 = "select distinct * from uids_only_visits_cache where advertiser = '{}' and pattern = '{}'"

class UidsCacheHandler(BaseHandler, AnalyticsBase, APIHelpers):

    def initialize(self, db=None, cassandra=None, crushercache=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.crushercache = crushercache

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.render("analysis/visit_urls.html", data=df)
        yield default, (data,)

    @decorators.deferred
    def defer_get_uids_cache(self, advertiser, pattern):


        results1 = self.crushercache.select_dataframe(QUERY1.format(advertiser, pattern))
        results2 = self.crushercache.select_dataframe(QUERY2.format(advertiser, pattern))
        df = {"sessions":
        ujson.loads(pandas.DataFrame(results1)[["num_sessions","sessions_user_count"]].to_json(orient='records')),"visits":ujson.loads(pandas.DataFrame(results2)[["num_visits","visit_user_count"]].to_json(orient='records'))}
        temp = results1.set_index("num_sessions").to_dict()
        return df

    @custom_defer.inlineCallbacks
    def get_cache_uids(self, advertiser, pattern):
        response_data = yield self.defer_get_uids_cache( advertiser, pattern)
        
        versioning = self.request.uri
        if versioning.find('v2') >=0:
            self.get_content_v2(response_data)
        else:
            self.get_content_v1(response_data)        
    
    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
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
