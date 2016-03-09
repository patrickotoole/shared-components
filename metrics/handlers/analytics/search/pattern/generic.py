import pandas
import logging
import time

import itertools

from twisted.internet import defer, threads
from lib.helpers import decorators
from lib.helpers import *

from lib.cassandra_cache.helpers import *

from handlers.analytics.domains.base import VisitDomainBase

from stats import PatternStatsBase
from response import PatternSearchResponse
from sample import PatternSearchSample
from ...visit_events import VisitEventBase

from lib.aho import AhoCorasick


class FilterBase:

    def get_filter(self,filter_id):
        Q = "SELECT * FROM action_filters WHERE action_id = %s and active = 1 and deleted = 0"
        return self.db.select_dataframe(Q % filter_id) 

    @decorators.deferred
    def get_filter_checker(self,filter_id):
        df = self.get_filter(filter_id)
        checker = AhoCorasick(list(df.filter_pattern)).has_match

        logging.info("constructed aho")
        return checker

    def run_filter_url(self,aho_filter,urls):
        truth_dict = { i: aho_filter(i.split("?")[1]) for i in urls }
        logging.info("ran aho filter on %s domains" % len(urls))
        return truth_dict


    @defer.inlineCallbacks
    def filter_and_build(self,full_df,dates,filter_id):
        aho_filter = yield self.get_filter_checker(filter_id)
        urls = set(full_df.url)
        value = self.run_filter_url(aho_filter,urls)

        df = full_df[full_df.url.map(lambda x: value[x] )]
        to_return = self.raw_to_stats(df,dates)

        defer.returnValue(to_return)



class GenericSearchBase(FilterBase,VisitDomainBase,PatternSearchSample,PatternStatsBase,PatternSearchResponse,VisitEventBase):


    @defer.inlineCallbacks
    def get_sampled(self,advertiser,term,dates,num_days,allow_sample=True,filter_id=False):
        sample_args = [term,"",advertiser,dates,num_days,False if filter_id else allow_sample]

        full_df, stats_df, url_stats_df, _ = yield self.sample_stats_onsite(*sample_args)

        if filter_id:
            stats_df, url_stats_df, full_df = yield self.filter_and_build(full_df,dates,filter_id)

        defer.returnValue([full_df, stats_df, url_stats_df, full_df])



    @defer.inlineCallbacks
    def build_arguments(self,advertiser,term,dates,num_days,response,allow_sample=True,filter_id=False,max_users=5000):
        args = [advertiser,term,build_datelist(num_days),num_days,allow_sample,filter_id]

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

