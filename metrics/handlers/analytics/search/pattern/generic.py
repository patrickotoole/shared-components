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
    
    LEVELS = {
                "l1":
                    ["uid_urls", "domains_full"],
                "l2":
                    ["domains", "urls", "pixel"],
                "l3":
                    ["url_to_action", "idf", "corpus"],
                "l4":
                    ["category_domains"]
                }
    DEPENDENTS = {
                    "domains":["domains_full"],
                    "urls":["uid_urls"],
                    "url_to_action":["pixel", "uid_urls"],
                    "category_domains":["domains", "idf"],
                    "idf" : ["domains"],
                    "pixel": [],
                    "domains_full":[],
                    "uid_urls": [],
                    "corpus": []
                }


    FUNCTION_MAP = {
            "pixel": {
                "func":"defer_get_pixel",
                "args":[],
            },
            "uid_urls": { 
                "func":"defer_get_uid_visits",
                "args":["advertiser", "uids", "term"],
            },
            "url_to_action": {
                "func":"defer_urls_to_actions",
                "args":["pixel","uid_urls"],
            },
            "urls": {
                "func":"defer_get_urls",
                "args":["uid_urls"],
            },
            "domains": {
                "func":"defer_get_domains",
                "args":["domains_full"],
            },
            "category_domains": {
                "func":"defer_domain_category",
                "args":["domains", "idf"],
            },
            "idf": {
                "func":"defer_get_idf",
                "args":["domains"],
            },
            "domains_full": {
                "func":"sample_offsite_domains",
                "args":["advertiser", "term", "uids", "dates", "ds"],
            },
            "corpus": {
                "func": "defer_get_corpus",
                "args":[]
            }
        }


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
        domain_set = domains_df['domain']

        QUERY = """
            SELECT p.domain, max(p.num_users) as num_users, p.idf, p.category_name, c.parent_category_name
            FROM pop_domain_with_category p          
            JOIN category c using (category_name)
            WHERE domain in (%(domains)s)
            group by domain
        """
        domain_set = [self.crushercache.escape_string(i.encode("utf-8")) for i in domain_set ]
        domains = "'" + "','".join(domain_set) + "'"
        results = self.crushercache.select_dataframe(QUERY % {"domains":domains})
        return results

    @decorators.deferred
    def defer_get_corpus(self):
        QUERY = "select * from nltk_corpus"
        results = self.crushercache.select_dataframe(QUERY)
        return results

    @decorators.deferred
    def defer_urls_to_actions(self, pixel, uid_urls):
        urls = set(uid_urls.url)
        results = self.urls_to_actions(pixel,urls)
        return results
    
    def get_dependents(self, datasets):
        dependents_nested = [self.DEPENDENTS[i] for i in datasets]
        dependents = [item for sublist in dependents_nested for item in sublist]
        needed = set(datasets)
        needed_dfs = list(needed) + dependents
        return needed_dfs

    @defer.inlineCallbacks
    def run_init_level(self, needed_dfs, level_datasets, shared_dict):
        l1_dfs = set(needed_dfs).intersection(level_datasets)
        _dl_l1 = []

        for fname in l1_dfs:
            func_name = self.FUNCTION_MAP[fname]['func']
            func = getattr(self, func_name)
            cargs = [shared_dict[a] for a in self.FUNCTION_MAP[fname]["args"]]
            _dl_l1.append(func(*cargs))

        dl = defer.DeferredList(_dl_l1)
        responses = yield dl
        defer_responses = [r[1] for r in responses]

        l1_dfs = dict(zip(l1_dfs, defer_responses))
        if l1_dfs.get('domains_full', False):
            shared_dict['domains_full'] = l1_dfs['domains_full'][0][1]
        if l1_dfs.get('uid_urls', False):
            shared_dict['uid_urls'] = l1_dfs['uid_urls'][0]

        defer.returnValue(shared_dict)

    @defer.inlineCallbacks
    def run_level(self, needed_dfs, level_datasets,shared_dict):
        l2_dfs = set(needed_dfs).intersection(level_datasets)
        _dl_l2 = []
        for fname in l2_dfs:
            func_name = self.FUNCTION_MAP[fname]['func']
            func = getattr(self, func_name)
            cargs = [shared_dict[a] for a in self.FUNCTION_MAP[fname]["args"]]
            _dl_l2.append(func(*cargs))
        
        if _dl_l2 !=[]:
            dl = defer.DeferredList(_dl_l2)
            responses = yield dl
            defer_responses = [r[1] for r in responses]

            l2_dfs = dict(zip(l2_dfs, defer_responses))
            for k in l2_dfs.keys():
                shared_dict[k] = l2_dfs[k]

        defer.returnValue(shared_dict)

    @defer.inlineCallbacks
    def build_arguments(self,advertiser,term,dates,num_days,response,allow_sample=True,filter_id=False,max_users=5000, datasets=['domains']):
        shared_dict={
                        "ds": "SELECT * FROM rockerbox.visitor_domains_full where uid = ?",
                        "advertiser" : advertiser,
                        "term": term,
                        "dates":dates,
                        "num_days":num_days,
                        "response":response                    
                    }

        try:
            needed_dfs = self.get_dependents(datasets)
        except:
            raise Exception("Not a valid dataset")

        #LEVEL 0
        args = [advertiser,term,dates,num_days,allow_sample,filter_id]
        #args = [advertiser,term,build_datelist(num_days),num_days,allow_sample,False]
        full_df, _, _, _ = yield self.get_sampled(*args)
        uids = list(set(full_df.uid.values))[:max_users]
        

        MIN_UIDS = 300
        if len(uids) < MIN_UIDS:
            ALLOWSAMPLEOVERRIDE = False
            NUM_DAYS = 7
            args[4] = ALLOWSAMPLEOVERRIDE
            args[3] = NUM_DAYS
            full_df, _, _, _ = yield self.get_sampled(*args)
            uids = list(set(full_df.uid.values))[:max_users]

        shared_dict['uids'] = uids
        shared_dict = yield self.run_init_level(needed_dfs, self.LEVELS["l1"], shared_dict)
        
        shared_dict = yield self.run_level(needed_dfs, self.LEVELS["l2"], shared_dict)
        shared_dict = yield self.run_level(needed_dfs, self.LEVELS["l3"], shared_dict)
        shared_dict = yield self.run_level(needed_dfs, self.LEVELS["l4"], shared_dict)
            
        returnDFs = {}
        returnDFs['response']=shared_dict['response']
        try:
            shared_dict['uid_urls']['hour'] = shared_dict['uid_urls'].timestamp.map(lambda x: x.split(" ")[1].split(":")[0])
        except:
            shared_dict = shared_dict
        for k in needed_dfs:
            returnDFs[k] = shared_dict[k]

        defer.returnValue(returnDFs)

