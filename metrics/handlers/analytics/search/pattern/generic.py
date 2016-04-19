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


    @defer.inlineCallbacks
    def build_arguments(self,advertiser,term,dates,num_days,response,allow_sample=True,filter_id=False,max_users=5000, datasets=['domains']):
        
        
        args = [advertiser,term,build_datelist(num_days),num_days,allow_sample,filter_id]

        full_df, _, _, _ = yield self.get_sampled(*args)
        uids = list(set(full_df.uid.values))[:max_users]

        if len(uids) < 300:
            args[4] = False
            args[3] = 7
            full_df, _, _, _ = yield self.get_sampled(*args)
            uids = list(set(full_df.uid.values))[:max_users]
        
        returnDFs = {}
        returnDFs['response'] = response
        
        if 'domains_full' in datasets and 'domains' in datasets:
            self.DOMAIN_SELECT = "select * from rockerbox.visitor_domains_full where uid = ?"
            
        elif 'domains' in datasets:
            self.DOMAIN_SELECT = "SELECT uid, domain, timestamp FROM rockerbox.visitor_domains_full where uid = ?"

        dom = yield self.sample_offsite_domains(advertiser, term, uids, num_days)

        if 'domains_full' in datasets and 'domains' in datasets:
            domains = dom[0][1][['uid','domain','timestamp']]
            domains_full = dom[0][1][['uid','timestamp','url']]
            returnDFs['domains'] = domains
            returnDFs['domains_full'] = domains_full
        elif 'domains' in datasets:
            domains = dom[0][1][['uid','domain','timestamp']]
            returnDFs['domains'] = domains

        
        if 'urls' in datasets and 'idf' in datasets and 'url_to_action' in datasets:
            _dl = [
                self.defer_get_uid_visits(*[advertiser,uids,term]),
                threads.deferToThread(self.get_idf,*[set(domains.domain)],**{}),
                threads.deferToThread(self.get_pixels,*[],**{})
            ]
            dl = defer.DeferredList(_dl)
            responses = yield dl
            urls, uid_urls = responses[0][1]
            uid_urls['hour'] = uid_urls.timestamp.map(lambda x: x.split(" ")[1].split(":")[0])
            idf = responses[1][1]
            pixel_df = responses[2][1]
            returnDFs['urls'] = urls
            returnDFs['idf'] = idf
            returnDFs['uid_urls']=uid_urls
        elif 'urls' in datasets and 'idf' in datasets:
            _dl = [
                self.defer_get_uid_visits(*[advertiser,uids,term]),
                threads.deferToThread(self.get_idf,*[set(domains.domain)],**{})
            ]
            dl = defer.DeferredList(_dl)
            responses = yield dl
            urls = responses[0][1]
            idf = responses[1][1]
            returnDFs['urls'] = urls
            returnDFs['idf'] = idf
        elif 'urls' in datasets and 'url_to_action' in datasets:
            _dl=[
                self.defer_get_uid_visits(*[advertiser,uids,term]),
                threads.deferToThread(self.get_pixels,*[],**{})
            ]
            dl = defer.DeferredList(_dl)
            responses = yield dl
            urls, uid_urls = responses[0][1]
            uid_urls['hour'] = uid_urls.timestamp.map(lambda x: x.split(" ")[1].split(":")[0])
            pixel_df = responses[2][1]
            returnDFs['urls'] = urls
        elif 'idf' in datasets and 'url_to_action' in datasets:
            _dl=[
                threads.deferToThread(self.get_idf,*[set(domains.domain)],**{}),
                threads.deferToThread(self.get_pixels,*[],**{})
            ]
            dl = defer.DeferredList(_dl)
            responses = yield dl
            idf = responses[1][1]
            pixel_df = responses[2][1]
            returnDFs['idf'] = idf
        elif 'urls' in datasets:
            _dl=[elf.defer_get_uid_visits(*[advertiser,uids,term])]
            dl = defer.DeferredList(_dl)
            responses = yield dl
            urls = responses[0][1]
            returnDFs['urls'] = urls
        elif 'idf' in datasets:
            _dl=[threads.deferToThread(self.get_idf,*[set(domains.domain)],**{})]
            dl = defer.DeferredList(_dl)
            responses = yield dl
            idf = responses[1][1]
            returnDFs['idf'] = idf
        elif 'url_to_action' in datasets:
            _dl=[threads.deferToThread(self.get_pixels,*[],**{})]
            dl = defer.DeferredList(_dl)
            responses = yield dl
            pixel_df = responses[2][1]

        if 'category_domains' in datasets:
            domains_with_cat = domains.merge(idf,on="domain")
            domains_with_cat['hour'] = domains_with_cat.timestamp.map(lambda x: x.split(" ")[1].split(":")[0])
            returnDFs['category_domains'] = domains_with_cat
            
        if 'url_to_action' in datasets:
            url_to_action = yield threads.deferToThread(self.urls_to_actions,*[pixel_df,set(uid_urls.url)],**{})
            returnDFs['url_to_action'] = url_to_action

        defer.returnValue(returnDFs)

