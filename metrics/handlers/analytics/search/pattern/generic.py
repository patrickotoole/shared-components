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

from transforms.temporal import *
from transforms.sessions import *
from transforms.timing import *
from transforms.before_and_after import *
from transforms.domain_intersection import *


class GenericSearchBase(VisitDomainBase,PatternSearchSample,PatternStatsBase,PatternSearchResponse,VisitEventBase):


    @defer.inlineCallbacks
    def get_users_sampled(self,advertiser,term,dates,num_days):
        sample_args = [term,"",advertiser,dates,num_days]

        df, stats_df, url_stats_df = yield self.sample_stats_onsite(*sample_args)

        uids = list(set(df.uid.values))[:5000]
        defer.returnValue([uids])

    def urls_to_actions(self,patterns,urls):

        def check(url):
            def _run(x):
                return x in url
            return _run

        p = patterns.url_pattern
        exist = { url: list(p[p.map(check(url))]) for url in urls }

        url_to_action = pandas.DataFrame(pandas.Series(exist),columns=["actions"])
        url_to_action.index.name = "url"

        return url_to_action
    
    def get_idf(self,domains):
        return get_idf(self.db,domains)

    def get_pixels(self):
        Q = "SELECT * from action_with_patterns where pixel_source_name = '%s'"
        pixel_df = self.db.select_dataframe(Q % self.current_advertiser_name)
        return pixel_df
      
    @defer.inlineCallbacks
    def process_uids(self,**kwargs):

        _dl = [
            threads.deferToThread(process_before_and_after,*[],**kwargs),
            threads.deferToThread(process_hourly,*[],**kwargs),
            threads.deferToThread(process_timing,*[],**kwargs),
            threads.deferToThread(process_domain_intersection,*[],**kwargs)
        ]

        dl = defer.DeferredList(_dl)
        responses = yield dl


        logging.info("Started transform...")
        response = kwargs.get("response")

        if len(kwargs.get("uids",[])) > 0:

            response['results'] = uids
            response['summary']['num_users'] = len(response['results'])

        logging.info("Finished transform.")

        defer.returnValue(response)
        

    @defer.inlineCallbacks
    def build_arguments(self,advertiser,term,dates,num_days,response):
        args = [advertiser,term,build_datelist(num_days),num_days]

        uids = yield self.get_users_sampled(*args)
        uids = uids[0]

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


    @defer.inlineCallbacks
    def get_uids(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.set_header("Access-Control-Allow-Origin","null")
        self.set_header("Access-Control-Allow-Credentials","true")
        PARAMS = "uid"
        indices = [PARAMS]
        term = pattern_terms[0][0]

        response = self.default_response(pattern_terms,logic)
        response['summary']['num_users'] = 0

        NUM_DAYS = 2
        args = [advertiser,term,build_datelist(NUM_DAYS),NUM_DAYS,response]

        now = time.time()

        logging.info("start build arguments for uid processing...")
        kwargs = yield self.build_arguments(*args)
        logging.info("finished building arguments: %s" % (now - time.time()) )

        response = yield self.process_uids(**kwargs)


        self.write_json(response)




