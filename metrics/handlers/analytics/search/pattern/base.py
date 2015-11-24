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

from helpers import PatternSearchHelpers
from stats import PatternStatsBase
from response import PatternSearchResponse


class PatternSearchBase(VisitDomainBase, SearchBase,PatternSearchHelpers, PatternStatsBase, PatternSearchResponse):


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
            response['clusters'] = model.cluster(_domains, prepped)
        
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

        PARAMS = "date, url, uid"
        indices = PARAMS.split(", ")

        response = self.default_response(pattern_terms,logic,no_results=True)
        response['summary']['num_users'] = 0

        import time
        start = time.time()
        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates]

        try:
            stats_df = self.get_stats(*args)

            self.response_summary(response,stats_df)
            if timeseries: 
                self.response_timeseries(response,stats_df)

            domain_stats_df = yield self.get_domain_stats(*args)
            url_stats_df = self.get_url_stats(*args)

            stats_df = stats_df.join(domain_stats_df).join(url_stats_df)

            print start - time.time()

            urls_df_no_ts = pandas.DataFrame(list(itertools.chain.from_iterable(url_stats_df['urls'].values)))
            urls = urls_df_no_ts.groupby("url").sum().reset_index().sort_index(by="count",ascending=False)
            response['urls'] = Convert.df_to_values(urls.head(3000))

            print start - time.time()

            domains_df_no_ts = pandas.DataFrame(list(itertools.chain.from_iterable(domain_stats_df['domains'].values)))
            domains = domains_df_no_ts.groupby("domain").sum().reset_index().sort_index(by="count",ascending=False)

            domains = domains.sort_index(by="count",ascending=False)
            response['domains'] = Convert.df_to_values(domains)#.head(3000))
           



        except Exception as e:

            frames = yield self.build_deferred_list(pattern_terms, PARAMS, advertiser, num_days, numdays=num_days)
            dfs = []

            
            for terms, result in zip(pattern_terms,frames):
                df = (yield result)[1]
                if len(df) > 0: 
                    dfs += [df]
            
            if len(dfs):

                df, tail = self.head_and_tail(dfs)

                for df2 in tail:
                    df = df.append(df2)
                    df = df.reset_index().drop_duplicates(indices).set_index(indices)

                df = df.reset_index()

            else:
                df = pandas.DataFrame([[0,0,0]],columns=["uid","num_views","date"]).ix[1:]
                response['results'] = []

            # APPLY "and" logic if necessary
            if logic == "and":
                df = self.pattern_and(df,pattern_terms)


            # PREPARE the final version of the data for response
            if len(df) > 0:
                stats = df.groupby("date").apply(self.calc_stats)
                for d in dates:
                    if d not in stats.index:
                        stats.ix[d] = 0

                response['summary']['num_urls'] = len(set(df.url.values))
                response['summary']['num_users'] = len(set(df.uid.values))
                response['summary']['num_views'] = stats.views.sum()
                response['summary']['num_visits'] = stats.visits.sum()
                
                if timeseries:
                    results = Convert.df_to_values(stats.reset_index())
                    response['results'] = results


                urls = self.get_urls_from_cache(advertiser,pattern_terms[0][0],build_datelist(20))

                response['urls'] = []
                for l in urls.values():
                    response['urls'] += l


                if len(urls) == 0:

                    df['count'] = df['occurrence'].map(lambda x: 1 if x == 0 else x)
                    grouped_urls = df.groupby("url")['count'].sum()
                    url_list = grouped_urls.reset_index().sort_index(by="count",ascending=False).T.to_dict().values()
                    response['urls'] = url_list


                # GET DOMAINS (from cache)
                defs = [self.defer_get_domains_with_cache(advertiser,pattern_terms[0][0],list(set(df.uid.values))[:1000],num_days)]
                dl = defer.DeferredList(defs)
                dom = yield dl
                if hasattr(dom[0][1],"uid"):
                    df = dom[0][1].groupby("domain")['uid'].agg(lambda x: len(set(x)))
                    domains = df.reset_index().rename(columns={"uid":"count"}).T.to_dict().values()
                else:
                    domains = dom[0][1].reset_index().rename(columns={"occurrence":"count"}).T.to_dict().values()
               
                response['domains'] = domains
        
        self.write_json(response)


    def get_count(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout)




    def get_timeseries(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout, True)


