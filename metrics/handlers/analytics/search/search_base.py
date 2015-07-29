import tornado.web
import logging

from search_helpers import SearchHelpers
from ..analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import *

class SearchBase(SearchHelpers,AnalyticsBase):

    @defer.inlineCallbacks
    def get_count(self, advertiser, terms, date_clause, logic="should",timeout=60):
        PARAMS = "uid"

        response = self.default_response(terms,logic)
        response['summary']['num_users'] = 0

        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, logic)

        if len(df) > 0:
            uids = df.uid.value_counts()
            response['summary']['num_users'] = len(uids)

        del response['results'] # there are no results for this API
        self.write_json(response)

    @defer.inlineCallbacks
    def get_timeseries(self, advertiser, terms, date_clause, logic="should",timeout=60):
        PARAMS = "timestamp, url, uid"

        response = self.default_response(terms,logic)
        
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, logic)
        
        if len(df) > 0:
            # Get the user counts for each timestamp, timestamp/url
            users = self.group_and_count(df, ["timestamp"], "uid", "num_users")
            visits = self.group_and_count(df, ["timestamp","url"], "uid", "num_visits")

            # Get the total number of visits, users
            response['summary']['num_visits'] = visits.num_visits.sum()
            response['summary']['num_users'] = len(df.uid.value_counts())
            
            # Make a timeseries for each unique url visits
            del visits["url"] # get rid of string since we dont need the name
            visits_ts = visits.groupby("timestamp").sum().sort().reset_index()
            
            # Combine the users/visits counts for each timestamp
            results = visits_ts.set_index("timestamp")
            results = results.join(users.set_index("timestamp")).reset_index()
            results = Convert.df_to_values(results)

            response['results'] = results
        
        self.write_json(response)

    @defer.inlineCallbacks
    def get_urls(self, advertiser, terms, date_clause, logic="should", timeout=60):
        PARAMS = "url, uid"
        response = self.default_response(terms,logic)

        df = yield self.defer_execute(PARAMS, advertiser, terms, 
                                       date_clause, logic, timeout=timeout)

        if df is False:
            self.write_timeout(terms, logic, timeout)
        elif len(df) == 0:
            self.write_json([])
        else:
            counts = self.group_and_count(df, ["url"], "uid", "count")
            
            response = {
                "search": terms, 
                "logic": logic, 
                "timeout": timeout,
                "results": Convert.df_to_values(counts)
                }
            
            self.write_json(response)

    @defer.inlineCallbacks
    def get_uids(self, advertiser, terms, date_clause, logic="should", timeout=60):
        PARAMS = "uid"
        response = self.default_response(terms,logic)

        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, logic)

        if len(df) > 0:
            response['results'] = df.drop_duplicates().uid.tolist()
            response['summary']['num_users'] = len(response['results'])

        self.write_json(response)
    



