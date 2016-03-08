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

class VisitorKeywordsHandler(PatternSearchCache,VisitDomainsFullHandler):

    def initialize(self, db=None, cassandra=None, zookeeper=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None
        self.zookeeper = zookeeper

    @decorators.deferred
    def defer_get_onsite_domains(self, date, advertiser, pattern):
        
        dates = build_datelist(7)
        args = [advertiser,pattern,dates]
        uids = self.get_uids_from_cache(*args)
        uids = list(set([u['uid'] for u in uids]))
        date_clause = self.make_date_clause("date",date,"","")

        results = self.full_get_w_agg_in(uids, date_clause)
        df = pandas.DataFrame(results)

        return df

    @decorators.deferred
    def process_visitor_domains(self, response_data):
        def split_url(x):
            return x.replace("-","/").split("/")
        GROUPS = ["url","uniques"]
        EXPAND_BY = "url"
        def grouping_function(x):
            # want to return a series (or dataframe) that has our new expanded series as the index
            the_grouped = x[EXPAND_BY].iloc[0]
            split_version = split_url(the_grouped)
            values = x["uniques"].values[0]
            return pandas.DataFrame(values,columns=["unique"],index=split_version)
        
        obj1 = response_data.groupby(GROUPS).apply(grouping_function)
        obj2 = obj1.groupby(level=2)

        obj3 = pandas.DataFrame(obj2["unique"].sum())
        full_url_response = obj3.reset_index().sort(columns=["unique"], ascending=False)
        full_url_response.columns = ["url", "uniques"]

        mask1 = ~full_url_response['url'].str.contains("http")
        mask2 = ~full_url_response['url'].str.contains(".co")
        mask3 = ~full_url_response['url'].str.contains(".org")
        
        filtered_df = full_url_response[mask1 & mask2 & mask3]

        self.get_content(filtered_df)


    @defer.inlineCallbacks
    def get_onsite_domains(self, date, kind, advertiser, pattern, num_keyword):
        
        logging.info("Requesting visitor domains...")
        response_data = yield self.defer_get_onsite_domains(date, advertiser, pattern)
        logging.info("Received visitor domains.")

        logging.info("Processing visitor domains...")
        visitor_domains = yield self.process_visitor_domains(response_data)
        logging.info("Finished processing visitor domains...")

        
        

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        kind = self.get_argument("kind", "")
        url_pattern = self.get_argument("url_pattern", "")
        user = self.current_advertiser_name
        num_keywords = self.get_argument("num_keywords", 3)

        try:
            keywords = int(num_keywords) - 1
        except:
            keyowrds = 3
        date_clause = self.make_date_clause("date", date, start_date, end_date)
        if formatted:
            self.get_onsite_domains(
                date_clause,
                kind,
                user,
                url_pattern,
                keywords
                )
        else:
            self.get_content(pandas.DataFrame())
