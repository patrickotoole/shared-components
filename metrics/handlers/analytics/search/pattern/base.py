import tornado.web
import tornado.gen
import pandas
import logging
import time

import itertools

from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *

import model
from ...visit_domains import VisitDomainBase
from ..search_base import SearchBase
from ..cache.pattern_search_cache import PatternSearchCache

from helpers import PatternSearchHelpers, group_sum_sort_np_array
from stats import PatternStatsBase
from response import PatternSearchResponse
from sample import PatternSearchSample


class PatternSearchBase(VisitDomainBase, PatternSearchSample, PatternStatsBase, PatternSearchResponse):


    @defer.inlineCallbacks
    def get_uid_domains(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60, numdays=5):
        PARAMS = "uid"
        indices = [PARAMS]

        response = self.default_response(pattern_terms,logic)
        response['summary']['num_users'] = 0

        terms, remaining_terms = self.head_and_tail(pattern_terms)
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must", False, numdays=2)


        if len(df) > 0:
            uids = list(set(df.uid.values))
            response['results'] = uids
            response['summary']['num_users'] = len(response['results'])

        defs = [self.defer_get_uid_domains(advertiser,pattern_terms[0][0],uids[:10000],date_clause)]


        dl = defer.DeferredList(defs)
        dom = yield dl

        _domains = dom[0][1]

        if len(_domains) > 100:
            prepped = _domains.unstack(1).fillna(0)
            try:
                #response['clusters'] = model.cluster(_domains, prepped)
                response['clusters'] = []
            except:
                pass
        
        self.write_json(response)


    @defer.inlineCallbacks
    def get_uids(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        PARAMS = "uid"
        indices = [PARAMS]

        response = self.default_response(pattern_terms,logic)
        response['summary']['num_users'] = 0

        terms, remaining_terms = self.head_and_tail(pattern_terms)
        
        # PUSH all the data into one dataframe
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must", False, numdays=5)
        df['terms'] = ",".join(terms)

        for terms in remaining_terms:
            df2 = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
            df2['terms'] = ",".join(terms)

            df = df.append(df2)
            df = df.drop_duplicates()

        df = df.reset_index()

        # APPLY "and" logic if necessary
        if logic == "and":
            df = self.pattern_and(df,pattern_terms)

        # PREPARE the final version of the data for response
        if len(df) > 0:
            response['results'] = list(set(df.uid.values))
            response['summary']['num_users'] = len(response['results'])
            
        
        self.write_json(response)

            
    @defer.inlineCallbacks
    def get_generic(self, advertiser, pattern_terms, num_days, logic="or",timeout=60,timeseries=False):

        REQUIRED_CACHE_DAYS = num_days if num_days < 7 else 7

        def check_required(df):
            assert(df.applymap(lambda x: x > 0).sum().sum() > REQUIRED_CACHE_DAYS)

        response = self.default_response(pattern_terms,logic,no_results=True)

        start = time.time()
        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates]

        try:

            raise Exception("YO")
            # pull daily data
            stats_df, domain_stats_df, url_stats_df = yield self.get_all_stats(*args)
            stats   = stats_df.join(domain_stats_df).join(url_stats_df)

            check_required(stats_df)

            # reformat daily into summary
            urls, domains = yield self.deferred_reformat_stats(url_stats_df,domain_stats_df)

            response = self.response_urls(response,urls)
            response = self.response_domains(response,domains)
            response = self.response_summary(response,stats)
            response = self.response_timeseries(response,stats) if timeseries else response


        except Exception as e:
            response = yield self.get_generic_missing(advertiser, pattern_terms, num_days, logic,timeout,timeseries)

        
        self.write_json(response)

    @defer.inlineCallbacks
    def get_generic_missing(self, advertiser, pattern_terms, num_days, logic="or",timeout=60,timeseries=False):
        PARAMS = "date, url, uid"
        indices = PARAMS.split(", ")

        response = self.default_response(pattern_terms,logic,no_results=True)

        start = time.time()
        dates = build_datelist(num_days)
        terms = pattern_terms[0][0]
        args = [terms,PARAMS,advertiser,dates,num_days]


        df, stats_df, url_stats_df = yield self.sample_stats_onsite(*args)
        uids = list(set(df.uid.values))[:1000]
        domain_stats_df = yield self.sample_stats_offsite(advertiser, terms, uids, num_days)
        stats   = stats_df.join(domain_stats_df).join(url_stats_df).fillna(0)

        urls, domains = yield self.deferred_reformat_stats(domain_stats_df,url_stats_df)

        response = self.response_urls(response,urls)
        response = self.response_domains(response,domains)
        response = self.response_summary(response,stats)
        response = self.response_timeseries(response,stats) if timeseries else response


        defer.returnValue(response)




    def get_count(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout)




    def get_timeseries(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout, True)


