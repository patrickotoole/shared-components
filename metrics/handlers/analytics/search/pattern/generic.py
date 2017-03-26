import pandas
import logging
import time

import itertools
import ujson
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
                    ["uid_urls", "domains_full", "actions"],
                "l2":
                    ["domains", "urls", "pixel", "artifacts"],
                "l3":
                    ["url_to_action", "idf", "corpus", "idf_hour"],
                "l4":
                    ["category_domains"]
                }
    DEPENDENTS = {
                    "domains":["domains_full"],
                    "urls":["uid_urls"],
                    "url_to_action":["pixel", "uid_urls", "actions"],
                    "category_domains":["domains", "idf"],
                    "idf" : ["domains"],
                    "idf_hour" : ["domains"],
                    "pixel": [],
                    "domains_full":[],
                    "uid_urls": [],
                    "corpus": [],
                    "artifacts":[],
                    "actions":[],
                }


    FUNCTION_MAP = {
            "actions": {
                "func":"defer_get_actions",
                "args":["advertiser"],
            },
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
                "args":["pixel","uid_urls", "actions"],
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
            "idf_hour": {
                "func":"defer_get_idf_hour",
                "args":["domains"],
            },
            "domains_full": {
                "func":"sample_offsite_domains",
                "args":["advertiser", "term", "uids", "dates", "ds"],
            },
            "corpus": {
                "func": "defer_get_corpus",
                "args":[]
            },
            "artifacts":{
                "func": "defer_get_artifacts",
                "args":["domains_full", "advertiser"]
            }
        }

    @decorators.deferred
    def defer_get_artifacts(self, domains_full_df, advertiser):
        Q1 = "select key_name, json from artifacts where advertiser = '%s' and active=1 and deleted=0"
        Q2 = "select key_name, json from artifacts where advertiser is null and active=1 and deleted=0"
        
        Q3 = "select url, topic from url_title WHERE url in (%(urls)s)"
        
        Q4 = "select category, idf, pct_users from category_idf"
        Q5 = "select category, hour, idf, pct_users from category_idf_hour"
        
        #Advertiser specific artifacts and general artifacts
        json = self.crushercache.select_dataframe(Q1 % advertiser)
        generic_json = self.crushercache.select_dataframe(Q2)
        results = {}
        for gjs in generic_json.iterrows():
            results[gjs[1]['key_name']] = ujson.loads(gjs[1]['json'])
        for js in json.iterrows():
            results[js[1]['key_name']] = ujson.loads(js[1]['json'])
        #Topic Artifacts
        #url_set = domains_full_df['url']
        #url_set = [self.crushercache.escape_string(i.encode("utf-8")) for i in url_set ]
        #url_set = self.remove_hex(set(url_set))
        #urls = "'" + "','".join(url_set) + "'"
        #topics_from_db = self.crushercache.select_dataframe(Q3 % {"urls":urls})
        #topic_js = {}
        #for top in topics_from_db.iterrows():
        #    topic_js[top[1]['url']] = {"topic":top[1]['topic']}
        #results['topics'] = topic_js
        #category artifacts
        category_idf = self.crushercache.select_dataframe(Q4)
        category_idf_js = {}
        for cat in category_idf.iterrows():
            category_idf_js[cat[1]['category']] = {"idf":cat[1]['idf'], "pct_users":cat[1]["pct_users"]}
        results['category_idf'] = category_idf_js
        #category_hour artifacts
        category_hour = self.crushercache.select_dataframe(Q5)
        category_hour_js = {}
        for cat_hour in category_hour.iterrows():
            if cat_hour[1]['category'] in category_hour_js.keys():
                category_hour_js[cat_hour[1]['category']][cat_hour[1]['hour']] ={"pct_users":cat_hour[1]["pct_users"], "idf": cat_hour[1]["idf"]}
            else:
                category_hour_js[cat_hour[1]['category']] = {cat_hour[1]['hour']: {"pct_users":cat_hour[1]["pct_users"], "idf": cat_hour[1]["idf"]}}
        results['category_hour'] = category_hour_js
        return results

    @decorators.deferred
    def defer_get_actions(self, advertiser):
        ACTIONSQUERY = "select a.action_id, a.action_name, a.url_pattern from action_with_patterns a join action b on a.action_id = b.action_id where a.pixel_source_name = '%s' and b.deleted=0 and b.active=1"
        results = self.db.select_dataframe(ACTIONSQUERY % advertiser)
        return results.to_dict('records')

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

    def remove_hex(self, domains):
        fixed = []
        for d in domains:
            try:
                dom = d.encode('latin')
                fixed.append(dom)
            except:
                logging.info("can't encode")
        return fixed

    @decorators.deferred
    def defer_get_idf(self, domains_df):
        domain_set = domains_df['domain']

        QUERY = """
            SELECT domain, total_users as num_users, idf, category_name, case when parent_category_name = "" then category_name else parent_category_name end as parent_category_name
            FROM domain_idf
            WHERE domain in (%(domains)s) and category_name != ""
        """
        domain_set = [self.crushercache.escape_string(i.encode("utf-8")) for i in domain_set ]
        domain_set = self.remove_hex(set(domain_set))
        domains = "'" + "','".join(domain_set) + "'"
        results = self.crushercache.select_dataframe(QUERY % {"domains":domains})
        
        return results

    @decorators.deferred
    def defer_get_idf_hour(self, domains_df):
        domain_set = domains_df['domain']

        QUERY2 = """
            SELECT domain, hour, total_users as num_users, idf
            FROM domain_idf_hour
            WHERE domain in (%(domains)s)
        """
        domain_set = [self.crushercache.escape_string(i.encode("utf-8")) for i in domain_set ]
        domain_set = self.remove_hex(set(domain_set))
        domains = "'" + "','".join(domain_set) + "'"
        results = self.crushercache.select_dataframe(QUERY2 % {"domains":domains})

        return results


    @decorators.deferred
    def defer_get_corpus(self):
        QUERY = "select * from nltk_corpus"
        results = self.crushercache.select_dataframe(QUERY)
        return results

    @decorators.deferred
    def defer_urls_to_actions(self, pixel, uid_urls, actions):
        urls = set(uid_urls.url)
        results = self.urls_to_actions(pixel,urls, actions, AhoCorasick)
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
            shared_dict['uid_urls'] = l1_dfs['uid_urls'][0] if l1_dfs['uid_urls'] is tuple else pandas.DataFrame()
        if l1_dfs.get('artifacts', False):
            shared_dict['artifacts'] = l1_dfs['artifacts']
        if l1_dfs.get('actions', False):
            shared_dict['actions'] = l1_dfs['actions']
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
    def build_arguments(self,advertiser,term,dates,num_days,response,allow_sample=None,filter_id=False,num_users=20000, datasets=['domains']):
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


        num_users = int(num_users)
        #LEVEL 0
        args = [advertiser,term,dates,num_days,allow_sample,filter_id]
        #args = [advertiser,term,build_datelist(num_days),num_days,allow_sample,False]
        full_df, _, _, _ = yield self.get_sampled(*args)
        uids = list(set(full_df.uid.values))[:num_users]
        

        MIN_UIDS = 300
        if len(uids) < MIN_UIDS:
            ALLOWSAMPLEOVERRIDE = False
            NUM_DAYS = 7
            args[4] = ALLOWSAMPLEOVERRIDE
            args[3] = NUM_DAYS
            full_df, _, _, _ = yield self.get_sampled(*args)
            uids = list(set(full_df.uid.values))[:num_users]

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

