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

from helpers import PatternSearchHelpers, group_sum_sort_np_array, check_required_days
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
    def get_users_sampled(self,advertiser,term,dates,num_days):
        sample_args = [term,"",advertiser,dates,num_days]

        df, stats_df, url_stats_df = yield self.sample_stats_onsite(*sample_args)

        uids = list(set(df.uid.values))[:5000]
        defer.returnValue([uids])

    @defer.inlineCallbacks
    def get_uids(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.set_header("Access-Control-Allow-Origin","null")
        self.set_header("Access-Control-Allow-Credentials","true")
        PARAMS = "uid"
        indices = [PARAMS]
        term = pattern_terms[0][0]

        response = self.default_response(pattern_terms,logic)
        response['summary']['num_users'] = 0

        num_days = 2
        
        uids = yield self.get_users_sampled(advertiser,term,build_datelist(num_days),num_days) 

        uids = uids[0]
        dom = yield self.sample_offsite_domains(advertiser, term, uids, num_days) 
        domain_stats_df  = dom[0][1]
       
        urls = yield self.defer_get_uid_visits(advertiser,uids,term)

        def time_groups(delta):
            minutes = [5,15,25,35,45,60,75,90,105,120,135,150,180,210,240,300,360,420,480,540,720,1080,1440,2880,4320,10080]

            for _min in minutes:
                if delta < _min:
                    return _min


        url_uids = set(urls.uid)
        domain_uids = set(domain_stats_df.uid)

        uids = url_uids.intersection(domain_uids)

        urls = urls[urls.uid.isin(uids)].drop_duplicates("uid")
        domain_stats_df = domain_stats_df[domain_stats_df.uid.isin(uids)]

        before_after_join = domain_stats_df.merge(urls,on="uid",how="left",suffixes=["_domain","_event"]).dropna()

        before_after_join['time_difference'] = pandas.to_datetime(before_after_join.timestamp_domain) - pandas.to_datetime(before_after_join.timestamp_event)
        after = before_after_join[before_after_join.time_difference > pandas.np.timedelta64(0,'ns')]
        before = before_after_join[before_after_join.time_difference <= pandas.np.timedelta64(0,'ns')]

        before['groups'] = before.time_difference.map(lambda x: -x / pandas.np.timedelta64(60, 's')).map(time_groups)
        grouped = before.groupby("groups")
        grouped = grouped.apply(lambda x: x[['domain','uid']].drop_duplicates().groupby("domain")['uid'].count())
        grouped = grouped.reset_index()

        QUERY = "select p.*, c.parent_category_name from reporting.pop_domain_with_category p join category c using (category_name) where domain in (%(domains)s)"
        domains = "'" + "','".join(set(grouped.domain)) + "'"
        idf = self.db.select_dataframe(QUERY % {"domains":domains})

        merged = grouped.merge(idf,on="domain")
        merged
        before_category = merged.groupby(["groups","parent_category_name"])['uid'].sum()

        before_category = before_category.unstack("parent_category_name").fillna(0).stack()
        before_category = (before_category.unstack("parent_category_name").T / before_category.unstack("parent_category_name").T.sum()).T.stack("parent_category_name")
        before_category.name = "count"

        def run_this(x):
            values = x[["groups","count"]].T.to_dict().values()
            return values

        before_categories = before_category.reset_index().groupby("parent_category_name").apply(run_this).to_dict()
        before_categories = [{"key":k,"values":v} for k,v in zip(before_categories.keys(),before_categories.values())]

        before_domains = merged.groupby("groups").apply(lambda x: x.groupby(['domain','parent_category_name'])[['uid']].sum().reset_index().T.rename(columns={"uid":"count"}).to_dict().values())




        urls = urls.groupby("uid").apply(lambda x: x[['timestamp','url']].sort_index(by="timestamp").to_dict(outtype="records") )

        domains = domain_stats_df.groupby("uid").apply(lambda x: x[['timestamp','domain']].sort_index(by="timestamp").to_dict(outtype="records") )

        domains = domains.ix[urls.index]
        domains = domains[~domains.isnull()]

        urls = urls.ix[domains.index]
        urls = urls[~urls.isnull()]

        #joined = urls.join(domains)

        if len(uids) > 0:
            response['before_categories'] = before_categories
            response['before_domains'] = before_domains.T.to_dict()

            response['results'] = uids
            response['domains'] = domains.T.to_dict()
            response['actions_events'] = urls.T.to_dict()


            response['summary']['num_users'] = len(response['results'])
        
        self.write_json(response)




    @defer.inlineCallbacks
    def get_generic_cached(self,advertiser,term,dates,num_days):
        args = [advertiser,term,dates]

        stats_df, domain_stats_df, url_stats_df = yield self.get_all_stats(*args)
        check_required_days(stats_df,num_days)

        defer.returnValue([stats_df, domain_stats_df, url_stats_df])

    @defer.inlineCallbacks
    def get_generic_sampled(self,advertiser,term,dates,num_days):
        sample_args = [term,"",advertiser,dates,num_days]

        df, stats_df, url_stats_df = yield self.sample_stats_onsite(*sample_args)

        uids = list(set(df.uid.values))[:1000]
        domain_stats_df = yield self.sample_stats_offsite(advertiser, term, uids, num_days) 

        defer.returnValue([stats_df, domain_stats_df, url_stats_df])
            
    @defer.inlineCallbacks
    def get_generic(self, advertiser, pattern_terms, num_days, logic="or",timeout=60,timeseries=False):

        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates,num_days]

        try: 
            stats_df, domain_stats_df, url_stats_df = yield self.get_generic_cached(*args)
        except: 
            stats_df, domain_stats_df, url_stats_df = yield self.get_generic_sampled(*args)

        stats = stats_df.join(domain_stats_df).join(url_stats_df).fillna(0)
        urls, domains = yield self.deferred_reformat_stats(domain_stats_df,url_stats_df)

        response = self.default_response(pattern_terms,logic,no_results=True)

        response = self.response_urls(response,urls)
        response = self.response_domains(response,domains)
        response = self.response_summary(response,stats)
        response = self.response_timeseries(response,stats) if timeseries else response

        self.write_json(response)

    def get_count(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout)

    def get_timeseries(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout, True)


    # THE FOLLOWING SHOULD BE ITS OWN ENDPOINT...



