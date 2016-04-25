import pandas
import logging
import time

import itertools

from twisted.internet import defer, threads
from lib.helpers import decorators
from lib.helpers import *

from lib.cassandra_cache.helpers import *

from stats import PatternStatsBase
from response import PatternSearchResponse
from ...visit_events import VisitEventBase
from helpers import PatternSearchHelpers
from lib.aho import AhoCorasick
from ..search_helpers import SearchHelpers

class GenericSearchBase(PatternStatsBase,PatternSearchResponse,VisitEventBase,PatternSearchHelpers, SearchHelpers):

    def identity(self,x):
        return x
    
    @decorators.deferred
    def defer_get_domains(self, domains):
        results = domains[['domain','uid','timestamp']]
        return results

    @decorators.deferred
    def defer_get_urls(self, uid_urls):
        results = uid_urls
        return results

    @decorators.deferred
    def defer_get_pixel(self):
        results = self.get_pixels()
        return results

    @decorators.deferred
    def defer_domain_category(self, domains, idf):
        domains_with_cat = domains.merge(idf,on="domain")
        domains_with_cat['hour']=domains_with_cat.timestamp.map(lambda x: x.split(" ")[1].split(":")[0])
        return domains_with_cat

    @decorators.deferred
    def defer_get_idf(self, domains_df):
        dd = domains_df['domain']
        results = self.get_idf(dd)
        return results

    @decorators.deferred
    def defer_urls_to_actions(self, pixel, uid_urls):
        urls = set(uid_urls.url)
        results = self.urls_to_actions(pixel,urls)
        return results

    @defer.inlineCallbacks
    def build_arguments(self,advertiser,term,dates,num_days,response,allow_sample=True,filter_id=False,max_users=5000, datasets=['domains']):

        LEVELS = {"l1":["uid_urls", "domains_full"], "l2":["domains", "urls", "pixel"], "l3": ["url_to_action", "idf"], "l4":["category_domains"]}
        DEPENDENTS = {  
                        "domains":["domains_full"],
                        "urls":["uid_urls"],
                        "url_to_action":["pixel", "uid_urls"],
                        "category_domains":["domains", "idf"],
                        "idf" : ["domains"],
                        "pixel": [],
                        "domains_full":[],
                        "uid_urls": []
                    }
        
        shared_dict={
                        "ds": "SELECT * FROM rockerbox.visitor_domains_full where uid = ?",
                        "advertiser" : advertiser,
                        "term": term,
                        "dates":dates,
                        "num_days":num_days,
                        "response":response                    
                    }
        
        FUNCTION_MAP = {"pixel":
                            {
                                "func":self.defer_get_pixel, 
                                "args":[], 
                            },
                        "uid_urls":
                            {
                                "func":self.defer_get_uid_visits, 
                                "args":["advertiser", "uids", "term"],
                            },
                        "url_to_action":
                            { 
                                "func":self.defer_urls_to_actions,
                                "args":["pixel","uid_urls"], 
                            },
                        "urls":
                            {
                                "func":self.defer_get_urls,
                                "args":["uid_urls"],
                            },
                        "domains":
                            {
                                "func":self.defer_get_domains,
                                "args":["domains_full"],
                            },
                        "category_domains":
                            {
                                "func":self.defer_domain_category,
                                "args":["domains", "idf"],
                            },
                        "idf":
                            {
                                "func":self.defer_get_idf, 
                                "args":["domains"],
                            },
                        "domains_full":
                            {
                                "func":self.sample_offsite_domains,
                                "args":["advertiser", "term", "uids", "num_days", "ds"], 
                            }
                }

        try:
            needed_dfs1 = [DEPENDENTS[i] for i in datasets]
            needed_dfs2 = set(datasets)
            needed_dfs4 = sum(needed_dfs1,[])
            needed_dfs = list(needed_dfs2) + needed_dfs4
        except:
            raise Exception("Not a valid dataset")

        #LEVEL 0
        args = [advertiser,term,build_datelist(num_days),num_days,allow_sample,filter_id]
        full_df, _, _, _ = yield self.get_sampled(*args)
        uids = list(set(full_df.uid.values))[:max_users]
        
        if len(uids) < 300:
            args[4] = False
            args[3] = 7
            full_df, _, _, _ = yield self.get_sampled(*args)
            uids = list(set(full_df.uid.values))[:max_users]

        shared_dict['uids'] = uids

        #Start LEVEL 1
        l1_dfs = set(needed_dfs).intersection(LEVELS["l1"])
        _dl_l1 = []        
        

        for fname in l1_dfs:
            func = FUNCTION_MAP[fname]['func']
            cargs = [shared_dict[a] for a in FUNCTION_MAP[fname]["args"]]
            _dl_l1.append(func(*cargs))

        dl = defer.DeferredList(_dl_l1)
        responses = yield dl
        defer_responses = [r[1] for r in responses]
        
        l1_dfs = dict(zip(l1_dfs, defer_responses))
        if l1_dfs.get('domains_full', False):
            shared_dict['domains_full'] = l1_dfs['domains_full'][0][1]
        if l1_dfs.get('uid_urls', False):
            shared_dict['uid_urls'] = l1_dfs['uid_urls'][0]
        
        #Start Level 2
        l2_dfs = set(needed_dfs).intersection(LEVELS["l2"])
        _dl_l2 = []
        for fname in l2_dfs:
            func = FUNCTION_MAP[fname]['func']
            cargs2 = [shared_dict[a] for a in FUNCTION_MAP[fname]["args"]]
            _dl_l2.append(func(*cargs2))

        dl = defer.DeferredList(_dl_l2)
        responses = yield dl
        defer_responses = [r[1] for r in responses]

        l2_dfs = dict(zip(l2_dfs, defer_responses))
        for k in l2_dfs.keys():
            shared_dict[k] = l2_dfs[k] 

        #Start Level 3
        l3_dfs = set(needed_dfs).intersection(LEVELS["l3"])
        _dl_l3 = []
        for fname in l3_dfs:
            func = FUNCTION_MAP[fname]['func']
            cargs3 = [shared_dict[a] for a in FUNCTION_MAP[fname]["args"]]
            _dl_l3.append(func(*cargs3))

        if _dl_l3 != []:
            dl = defer.DeferredList(_dl_l3)
            responses = yield dl
            defer_responses = [r[1] for r in responses]

            l3_dfs = dict(zip(l3_dfs, defer_responses))
            for k in l3_dfs.keys():
                shared_dict[k] = l3_dfs[k]

        #Start Level4
        l4_dfs = set(needed_dfs).intersection(LEVELS["l4"])
        _dl_l4=[]
        for fname in l4_dfs:
            func = FUNCTION_MAP[fname]['func']
            cargs4 = [shared_dict[a] for a in FUNCTION_MAP[fname]["args"]]
            _dl_l4.append(func(*cargs4))
       
        if _dl_l4 !=[]:
            dl = defer.DeferredList(_dl_l4)
            responses = yield dl
            defer_responses = [r[1] for r in responses]
            
            l4_dfs = dict(zip(l4_dfs, defer_responses))
            for k in l4_dfs.keys():
                shared_dict[k] = l4_dfs[k]

            
        returnDFs = {}
        returnDFs['response']=shared_dict['response']
        try:
            shared_dict['uid_urls']['hour'] = shared_dict['uid_urls'].timestamp.map(lambda x: x.split(" ")[1].split(":")[0])
        except:
            shared_dict = shared_dict
        for k in needed_dfs:
            returnDFs[k] = shared_dict[k]

        defer.returnValue(returnDFs)

