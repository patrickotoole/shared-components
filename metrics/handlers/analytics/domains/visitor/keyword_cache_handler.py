import tornado.web
import ujson
import pandas
import StringIO
import logging

import re

from link import lnk
from ..user.full_handler import VisitDomainsFullHandler
from handlers.base import BaseHandler
from ...analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *
from ...search.cache.pattern_search_cache import PatternSearchCache

#QUERY = "select advertiser, url_pattern, keyword, uniques, count from keyword_crusher_cache where advertiser = '{}' and url_pattern = '{}'"
QUERY = "select advertiser, url_pattern, keyword, count from keyword_crusher_cache where advertiser = '{}' and url_pattern = '{}'"

class KeywordCacheHandler(PatternSearchCache,VisitDomainsFullHandler):

    @decorators.deferred
    def defer_get_onsite_cache(self, advertiser, pattern, top_count):

        sql = lnk.dbs.rockerbox
        results  = sql.select_dataframe(QUERY.format(advertiser, pattern))
        sort_results = results.sort(["count"], ascending=False)
        results_no_NA = sort_results[sort_results["keyword"] != " "]
        df = pandas.DataFrame(results_no_NA.iloc[:int(top_count)])
        return df

    @defer.inlineCallbacks
    def get_cache_domains(self, advertiser, pattern, top_count):
        response_data = yield self.defer_get_onsite_cache( advertiser, pattern, top_count)
        self.get_content(response_data)
    
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        url_pattern = self.get_argument("url_pattern", "")
        user = self.current_advertiser_name
        top_count = self.get_argument("top", 50)

        if formatted:
            self.get_cache_domains( user, url_pattern, top_count)
        else:
            self.get_content(pandas.DataFrame())
