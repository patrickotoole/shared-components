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
from ...domains.base_domain_handler import BaseDomainHandler
from lib.aho import AhoCorasick


class GenericSearchBase(BaseDomainHandler,PatternStatsBase,PatternSearchResponse,VisitEventBase):


    @defer.inlineCallbacks
    def build_arguments(self,advertiser,term,dates,num_days,response,allow_sample=True,filter_id=False,max_users=5000):
        args = [advertiser,term,build_datelist(num_days),num_days,allow_sample,filter_id]

        full_df, _, _, _ = yield self.get_sampled(*args)
        uids = list(set(full_df.uid.values))[:max_users]

        if len(uids) < 300:
            args[4] = False
            args[3] = 7
            full_df, _, _, _ = yield self.get_sampled(*args)
            uids = list(set(full_df.uid.values))[:max_users]

        dom = yield self.sample_offsite_domains(advertiser, term, uids, num_days)
        domains = dom[0][1]

        _dl = [
            self.defer_get_uid_visits(*[advertiser,uids,term]),
            threads.deferToThread(self.get_idf,*[set(domains.domain)],**{}),
            threads.deferToThread(self.get_pixels,*[],**{})
        ]
 
        dl = defer.DeferredList(_dl)
        responses = yield dl

        urls, uid_urls = responses[0][1]
        idf = responses[1][1]
        pixel_df = responses[2][1]


        uid_urls['hour'] = uid_urls.timestamp.map(lambda x: x.split(" ")[1].split(":")[0])
        domains_with_cat = domains.merge(idf,on="domain")
        domains_with_cat['hour'] = domains_with_cat.timestamp.map(lambda x: x.split(" ")[1].split(":")[0])

        url_to_action = yield threads.deferToThread(self.urls_to_actions,*[pixel_df,set(uid_urls.url)],**{})

        defer.returnValue({
            "idf": idf,
            "urls": urls,
            "uid_urls": uid_urls,
            "domains": domains,
            "category_domains": domains_with_cat,
            "url_to_action": url_to_action,
            "response": response
        })

