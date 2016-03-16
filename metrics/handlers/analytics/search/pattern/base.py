import tornado.web
import tornado.gen
import pandas
import logging
import time

import itertools

from twisted.internet import defer
from twisted.internet import threads
from lib.helpers import decorators
from lib.helpers import *

from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *

import model

from helpers import check_required_days
from base_timeseries import TimeseriesBase
from base_visitors import VisitorBase


class PatternSearchBase(TimeseriesBase,VisitorBase):

    @defer.inlineCallbacks
    def get_uid_domains(self, advertiser, pattern_terms, date_clause, process=False, filter_id=False, logic="or",timeout=60, numdays=5):
        self.set_header("Access-Control-Allow-Origin","null")
        self.set_header("Access-Control-Allow-Credentials","true")

        PARAMS = "uid"

        response = self.default_response(pattern_terms,logic)
        response['summary']['num_users'] = 0

        terms, remaining_terms = self.head_and_tail(pattern_terms)
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must", False, numdays=2)


        if len(df) > 0:
            uids = list(set(df.uid.values))
            response['results'] = uids
            response['summary']['num_users'] = len(response['results'])

        defs = [self.defer_get_uid_domains(advertiser,pattern_terms[0][0],uids[:10000],date_clause)]

        # need uids, domains


        dl = defer.DeferredList(defs)
        dom = yield dl

        _domains = dom[0][1]

        response['summary']['num_domains'] = len(set(_domains.reset_index().domain))
        response['domains'] = list(_domains.reset_index().domain)
        response['summary']['num_points'] = len(_domains.reset_index().domain)
        response['summary']['num_users_with_domains'] = len(set(_domains.reset_index().uid))


        prepped = _domains.unstack(1).fillna(0)

        try:
            if len(_domains) < 100: raise "Error: too few domains"
            
            clusters, similarity, uid_clusters = yield threads.deferToThread(model.cluster,*[_domains, prepped])

            response['clusters'] = clusters
            response['similarity'] = similarity

            response['uid_clusters'] = uid_clusters

            # response['clusters'] = []
        except Exception as e:
            logging.info("Issue building the model", e)
            pass

        x = yield self.write_json_deferred(response)


    @defer.inlineCallbacks
    def get_generic_cached(self,advertiser,term,dates,num_days):
        args = [advertiser,term,dates]

        stats_df, domain_stats_df, url_stats_df = yield self.get_all_stats(*args)
        check_required_days(stats_df,num_days)

        defer.returnValue([stats_df, domain_stats_df, url_stats_df])

    @defer.inlineCallbacks
    def get_generic_sampled(self,advertiser,term,dates,num_days):
        sample_args = [term,"",advertiser,dates,num_days]

        filter_id = self.get_argument("filter_id",False) 
        if filter_id:
            args = [advertiser,term,dates,num_days,True,filter_id]
            df, stats_df, url_stats_df, full_df = yield self.get_sampled(*args)

        else:
            df, stats_df, url_stats_df, full_df = yield self.sample_stats_onsite(*sample_args)
        uids = list(set(df.uid.values))[:1000]
        domain_stats_df = yield self.sample_stats_offsite(advertiser, term, uids, num_days)
        defer.returnValue([stats_df, domain_stats_df, url_stats_df])


    @defer.inlineCallbacks
    def get_uids_only(self, advertiser, pattern_terms, num_days, logic="or",timeout=60, **kwargs):

        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates]

        uids = yield self.get_uids_from_cache(*args)
        uids = list(set([u['uid'] for u in uids]))

        urls, raw_urls = yield self.defer_get_uid_visits(advertiser,uids,"adsf")

        df = raw_urls.groupby(["uid"])['date'].apply(lambda x: pandas.DataFrame( pandas.Series({"visits":len(x),"sessions": len(x.unique())} ) ).T )
        results = df.reset_index()[['uid','sessions','visits']].to_dict('records')

        response = self.default_response(pattern_terms,logic)
        response['results'] = results

        self.write_json(response)


    @defer.inlineCallbacks
    def get_domains(self, advertiser, pattern_terms, num_days, logic="or",timeout=60,timeseries=False):
        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates,num_days]

        stats_df, domain_stats_df, url_stats_df = yield self.get_generic_sampled(*args)
        domains = yield self.domain_stats_to_domains(domain_stats_df)
        idf = yield self.get_idf(list(set(domains.domain)))
      
        domains = domains.merge(idf,on="domain")

        response = self.default_response(pattern_terms,logic,no_results=True)
        response = self.response_domains(response,domains)

        self.write_json(response)

    


    @defer.inlineCallbacks
    def get_generic(self, advertiser, pattern_terms, num_days, logic="or",timeout=60,timeseries=False):
        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates,num_days]

        try:
            stats_df, domain_stats_df, url_stats_df = yield self.get_generic_cached(*args)
        except Exception as e:
            logging.info("Cache not present -- sampling instead: %s" % e)
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

