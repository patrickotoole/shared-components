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
from handlers.analytics.visit_events import VisitEventBase
from handlers.analytics.search.cache.pattern_search_cache import PatternSearchCache
from handlers.analytics.search.search_helpers import SearchHelpers
import lib.custom_defer as custom_defer

QUERY1 = "select distinct * from uids_only_sessions_cache where advertiser = '{}' and pattern = '{}'"
QUERY2 = "select distinct * from uids_only_visits_cache where advertiser = '{}' and pattern = '{}'"

class UidsOnsiteHandler(BaseHandler, AnalyticsBase, APIHelpers, VisitEventBase, PatternSearchCache,SearchHelpers):

    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra

    @custom_defer.inlineCallbacks
    def get_uids_only(self, advertiser, pattern_terms, num_days, logic="or",timeout=60, **kwargs):

        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms,dates]

        uids = yield self.get_uids_from_cache(*args)
        uids = list(set([u['uid'] for u in uids]))

        urls, raw_urls = yield self.defer_get_uid_visits(advertiser,uids,"adsf")

        df = raw_urls.groupby(["uid"])['date'].apply(lambda x: pandas.DataFrame( pandas.Series({"visits":len(x),"sessions": len(x.unique())} ) ).T )
        results = df.reset_index()[['uid','sessions','visits']].to_dict('records')

        response = self.default_response(pattern_terms,logic)
        response['results'] = results

        self.write_json(response)

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        url_pattern = self.get_argument("url_pattern", "")
        user = self.current_advertiser_name

        try:
            self.get_uids_only(
                user,
                url_pattern,
                3
                )
        except:
            self.get_content(pandas.DataFrame())
