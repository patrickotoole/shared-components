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
import lib.custom_defer as custom_defer

KEYWORD_DATE = "SELECT advertiser, url_pattern, keyword, count FROM keyword_crusher_cache WHERE url_pattern = '%(url_pattern)s' and advertiser = '%(advertiser)s' and record_date='%(record_date)s'"

DATE_FALLBACK = "select distinct record_date from keyword_crusher_cache where url_pattern='%(url_pattern)s' and advertiser='%(advertiser)s' order by record_date DESC" 

class KeywordCacheHandler(PatternSearchCache,VisitDomainsFullHandler):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache = crushercache

    def getRecentDate(self, url_pattern, advertiser):
        query_dict = {"url_pattern":url_pattern, "advertiser":advertiser}
        datefallback = self.crushercache.select_dataframe(DATE_FALLBACK % query_dict)
        now_date = str(datefallback['record_date'][0])
        return now_date

    def now(self):
        from datetime import datetime
        today = datetime.today()
        return str(today).split(".")[0]

    @decorators.deferred
    def defer_get_onsite_cache(self, advertiser, pattern, top_count, filter_date):
        now_date = filter_date
        query_dict = {"url_pattern":pattern, "advertiser":advertiser, "record_date":filter_date}
        if not filter_date:
            now_date = self.now()
            query_dict["record_date"] = now_date
        QUERY = KEYWORD_DATE % query_dict
        results  = self.crushercache.select_dataframe(QUERY)
        if len(results) == 0 and not filter_date:
            now_date = self.getRecentDate(pattern, advertiser)
            query_dict["record_date"] = now_date
            QUERY = KEYWORD_DATE % query_dict
            results = self.crushercache.select_dataframe(QUERY)
        
        sort_results = results.sort(["count"], ascending=False)
        results_no_NA = sort_results[sort_results["keyword"] != " "]
        df = pandas.DataFrame(results_no_NA.iloc[:int(top_count)])
        return df

    @custom_defer.inlineCallbacksErrors
    def get_cache_domains(self, advertiser, pattern, top_count, filter_date):
        logging.info(self.request)
        response_data = yield self.defer_get_onsite_cache( advertiser, pattern, top_count, filter_date)
        if len(response_data)>0:
            versioning = self.request.uri
            if versioning.find('v1') >=0:
                self.get_content_v1(response_data)
            else:
                summary = self.summarize(response_data)
                self.get_content_v2(response_data, summary)
        else:
            self.set_status(400)
            self.write(ujson.dumps({"error":str(Exception("No Data"))}))
            self.finish()

    
    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        formatted = self.get_argument("format", False)
        url_pattern = self.get_argument("url_pattern", "")
        user = self.current_advertiser_name
        top_count = self.get_argument("top", 50)
        filter_date = self.get_argument("date",False)

        self.get_cache_domains( user, url_pattern, top_count, filter_date)
