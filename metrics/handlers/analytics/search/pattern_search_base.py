import tornado.web
import pandas
import logging

from search_base import SearchBase
from pattern_search_helpers import PatternSearchHelpers
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *


class PatternSearchBase(SearchBase,PatternSearchHelpers):

    @defer.inlineCallbacks
    def get_uids(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        PARAMS = "uid"
        indices = [PARAMS]

        response = self.default_response(pattern_terms,logic)
        response['summary']['num_users'] = 0

        terms, remaining_terms = self.head_and_tail(pattern_terms)
        
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
        df['terms'] = ",".join(terms)

        for terms in remaining_terms:
            df2 = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
            df2['terms'] = ",".join(terms)

            df = df.append(df2)
            df = df.drop_duplicates()

        df = df.reset_index()

        if logic == "and":
            df = self.pattern_and(df,pattern_terms)

        if len(df) > 0:
            response['results'] = list(set(df.uid.values))
            response['summary']['num_users'] = len(response['results'])
            
        
        self.write_json(response)



    @defer.inlineCallbacks
    def get_generic(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60,timeseries=False):
        PARAMS = "date, url, uid"
        indices = PARAMS.split(", ")

        response = self.default_response(pattern_terms,logic,no_results=True)
        response['summary']['num_users'] = 0

        terms, remaining_terms = self.head_and_tail(pattern_terms)
        
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
        df = self.group_count_view(df,terms,indices) 

        for terms in remaining_terms:
            df2 = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
            df2 = self.group_count_view(df2,terms,indices)

            # append and get rid of duplicates...
            df = df.append(df2)
            df = df.reset_index().drop_duplicates(indices).set_index(indices)

        df = df.reset_index()

        if logic == "and":
            df = self.pattern_and(df,pattern_terms)

        if len(df) > 0:
            stats = df.groupby("date").apply(self.calc_stats)

            response['summary']['num_users'] = len(set(df.uid.values))
            response['summary']['num_views'] = stats.num_views.sum()
            response['summary']['num_visits'] = stats.num_visits.sum()
            
            if timeseries:
                results = Convert.df_to_values(stats.reset_index())
                response['results'] = results
        
        self.write_json(response)


    def get_count(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout)

    def get_timeseries(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout,True)


