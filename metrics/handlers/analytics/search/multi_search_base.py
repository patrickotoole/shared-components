import tornado.web
import pandas
import logging
import time

from search_base import SearchBase
from multi_search_helpers import MultiSearchHelpers
from ..visit_domains import VisitDomainBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *




class MultiSearchBase(VisitDomainBase,SearchBase,MultiSearchHelpers):

    def build_deferred_list(self,steps,logic,advertiser,date_clause,PARAMS):

        deferreds = [] 
        deferred_meta = []

        for step_key, step in enumerate(steps):
            
            for i,group in enumerate(step['pattern_groups']):
                
                terms = group['patterns']
                logic = group['logic']
                    
                deferreds += [self.defer_execute(PARAMS, advertiser, terms, date_clause, logic)]
                deferred_meta += [{
                    "step": step_key,
                    "group": i,
                    "group_logic": step['logic'],
                    "terms": ",".join(group['patterns']),
                }] 

        return (deferred_meta,defer.DeferredList(deferreds))


    @defer.inlineCallbacks
    def defer_get_uids(self, advertiser, terms, date_clause, timeout=60):
        PARAMS = "uid"
        indices = [PARAMS]
        response = self.default_response(terms,terms['logic'])

        meta, deferreds = self.build_deferred_list(
            terms['steps'],
            terms['logic'],
            advertiser,date_clause,PARAMS
        )

        frames = yield deferreds
        funnel_frames = self.build_funnel_groups(frames,meta)
        funnel_frame_sizes = [len(i) for i in funnel_frames]
        funnel_data = self.reshape_funnel_groups(funnel_frames)
        
        response['results'] = self.funnel_response(funnel_data,len(terms['steps']),funnel_frame_sizes)
        
        defer.returnValue(response)

    @defer.inlineCallbacks
    def get_uids(self, advertiser, terms, date_clause, timeout=60):
        
        response = yield self.defer_get_uids(advertiser, terms, date_clause, timeout=timeout)

        cache_string = "%s %s %s" % (advertiser, terms, date_clause)
        self.set_cache(cache_string, response)
 
        self.write_json(response)

    @defer.inlineCallbacks
    def get_count(self, advertiser, terms, date_clause, timeout=60):
        
        response = yield self.defer_get_uids(advertiser, terms, date_clause, timeout=timeout)
        for step in response['results']:
            del step['uids']

        self.write_json(response)

    @defer.inlineCallbacks
    def get_domains(self, advertiser, terms, date_clause, timeout=60):

        arguments = (advertiser, terms, date_clause, timeout)
        cache_string = "%s %s %s" % (advertiser, terms, date_clause)

        response = self.check_cache(cache_string) or (yield self.defer_get_uids(*arguments))

        defs = [self.defer_get_domains(step['uids'],date_clause) for step in response['results']]

        dl = defer.DeferredList(defs)
        step_domains = yield dl

        uids = []
        for i,domains in enumerate(step_domains):
            uids += [response['results'][i]['uids']]
            del response['results'][i]['uids']
            counts = domains[1].groupby("domain").agg({"uid":lambda x: len(set(x))})
            counts = counts.reset_index().T.to_dict().values()
            response['results'][i]['domains'] = counts

        self.write_json(response)

        for i,domains in enumerate(step_domains):
            response['results'][i]['uids'] = uids[i]



    @defer.inlineCallbacks
    def get_avails(self, advertiser, terms, date_clause, timeout=60):

        arguments = (advertiser, terms, date_clause, timeout)
        cache_string = "%s %s %s" % (advertiser, terms, date_clause)

        response = self.check_cache(cache_string) or (yield self.defer_get_uids(*arguments))
        
        defs = [self.defer_get_domains(step['uids'],date_clause) for step in response['results']]

        dl = defer.DeferredList(defs)
        step_domains = yield dl
        
        uids = []
        for i,domains in enumerate(step_domains):
            uids += [response['results'][i]['uids']]
            del response['results'][i]['uids']
            counts = domains[1].groupby("uid").first()
            response['results'][i]['avails'] = len(counts)

        self.write_json(response)

        for i,domains in enumerate(step_domains):
            response['results'][i]['uids'] = uids[i]


