import tornado.web
import tornado.gen
import pandas
import logging
import time

from search_base import SearchBase
from pattern_search_helpers import PatternSearchHelpers
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from ..visit_domains import VisitDomainBase


def callback(yo,*args):
    print yo
    import ipdb; ipdb.set_trace()
    time.sleep(10)
    print yo
    return


class PatternSearchBase(VisitDomainBase, SearchBase,PatternSearchHelpers):

    @defer.inlineCallbacks
    def get_uids(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        PARAMS = "uid"
        indices = [PARAMS]

        response = self.default_response(pattern_terms,logic)
        response['summary']['num_users'] = 0

        terms, remaining_terms = self.head_and_tail(pattern_terms)
        
        # PUSH all the data into one dataframe
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
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

        

 

    @defer.inlineCallbacks
    def get_uids(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        PARAMS = "uid"
        indices = [PARAMS]

        response = self.default_response(pattern_terms,logic)
        response['summary']['num_users'] = 0

        terms, remaining_terms = self.head_and_tail(pattern_terms)
        
        # PUSH all the data into one dataframe
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
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

    def build_deferred_list(self, terms_list, params, advertiser, date_clause, logic="must"):
        dl = []
        for terms in terms_list:
            dl += [self.defer_execute(params, advertiser, terms, date_clause, logic)]

        
        return defer.DeferredList(dl)


    @tornado.gen.coroutine
    def counter(self, *args, **kwargs):
        print 'hi'
        time.sleep(10)
        print "hi"
        
    @defer.inlineCallbacks
    def get_generic(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60,timeseries=False):
        
        PARAMS = "date, url, uid"
        indices = PARAMS.split(", ")

        response = self.default_response(pattern_terms,logic,no_results=True)
        response['summary']['num_users'] = 0

        frames = yield self.build_deferred_list(pattern_terms, PARAMS, advertiser, date_clause)
        dfs = []

        for terms, result in zip(pattern_terms,frames):
            df = (yield result)[1]
            if len(df) > 0: 
                dfs += [df]#[self.group_count_view(df,terms,indices)]
        
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

            response['summary']['num_urls'] = len(set(df.url.values))
            response['summary']['num_users'] = len(set(df.uid.values))
            response['summary']['num_views'] = stats.num_views.sum()
            response['summary']['num_visits'] = stats.num_visits.sum()
            
            if timeseries:
                results = Convert.df_to_values(stats.reset_index())
                response['results'] = results

            df['occurrence'] = df['occurrence'].map(lambda x: 1 if x == 0 else x)

            url_list = df.groupby("url")['occurrence'].sum().reset_index().sort_index(by="occurrence",ascending=False).T.to_dict().values()
            response['urls'] = url_list
            defs = [self.defer_get_domains(list(set(df.uid.values))[:1000],date_clause)]
            dl = defer.DeferredList(defs)
            dom = yield dl
            df = dom[0][1].groupby("domain")['uid'].agg(lambda x: len(set(x)))
   
            domains = df.reset_index().rename(columns={"uid":"occurrence"}).T.to_dict().values()
            response['domains'] = domains
        
        self.write_json(response)


    def get_count(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout)

    def get_timeseries(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout,True)


