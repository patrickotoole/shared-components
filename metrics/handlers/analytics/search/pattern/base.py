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
from generic import *



class PatternSearchBase(GenericSearchBase):


    @defer.inlineCallbacks
    def get_uid_domains(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60, numdays=5):
        self.set_header("Access-Control-Allow-Origin","null")
        self.set_header("Access-Control-Allow-Credentials","true")

        PARAMS = "uid"
        indices = [PARAMS]

        response = self.default_response(pattern_terms,logic)
        response['summary']['num_users'] = 0

        terms, remaining_terms = self.head_and_tail(pattern_terms)
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must", False, numdays=2)


        if len(df) > 0:
            uids = list(set(df.uid.values))
            response['results'] = uids
            response['summary']['num_users'] = len(response['results'])

        defs = [self.defer_get_uid_domains(advertiser,pattern_terms[0][0],uids[:10000],date_clause)]


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
            clusters, similarity, uid_clusters = yield model.cluster(_domains, prepped)

            response['clusters'] = clusters
            response['similarity'] = similarity

            response['uid_clusters'] = uid_clusters

            # response['clusters'] = []
        except Exception as e:
            logging.info("Issue building the model", e)
            pass

        x = yield self.write_json_deferred(response)




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

        # lets do this stuff in parallel! woo threads!!

        _dl = [
            threads.deferToThread(process_before_and_after,*[],**kwargs),
            threads.deferToThread(process_hourly,*[],**kwargs),
            threads.deferToThread(process_sessions,*[],**kwargs),
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

        import time
        now = time.time()

        logging.info("start build arguments for uid processing...")
        kwargs = yield self.build_arguments(*args)
        logging.info("finished building arguments: %s" % (now - time.time()) )

        response = yield self.process_uids(**kwargs)


        self.write_json(response)




    @defer.inlineCallbacks
    def get_generic_cached(self,advertiser,term,dates,num_days):
        args = [advertiser,term,dates]

        stats_df, domain_stats_df, url_stats_df = yield self.get_all_stats(*args)
        check_required_days(stats_df,num_days)

        defer.returnValue([stats_df, domain_stats_df, url_stats_df])

    @defer.inlineCallbacks
    def get_generic_sampled(self,advertiser,term,dates,num_days):
        sample_args = [term,"",advertiser,dates,num_days]
        df, stats_df, url_stats_df, full_df = yield self.sample_stats_onsite(*sample_args)
        uids = list(set(df.uid.values))[:1000]
        domain_stats_df = yield self.sample_stats_offsite(advertiser, term, uids, num_days)
        defer.returnValue([stats_df, domain_stats_df, url_stats_df])


    @defer.inlineCallbacks
    def get_ts_cached(self,advertiser,term,dates,num_days):
        args = [advertiser,term,dates]

        stats_df, url_stats_df = yield self.get_page_stats(*args)
        check_required_days(stats_df,num_days)

        defer.returnValue([stats_df, url_stats_df])

    @defer.inlineCallbacks
    def get_ts_sampled(self,advertiser,term,dates,num_days,allow_sample=True):
        sample_args = [term,"",advertiser,dates,num_days,allow_sample]

        df, stats_df, url_stats_df, full_df = yield self.sample_stats_onsite(*sample_args)


        defer.returnValue([stats_df, url_stats_df, full_df])

    @decorators.deferred
    def get_filter_checker(self,filter_id):
        Q = "SELECT * FROM action_filters WHERE action_id = %s and active = 1 and deleted = 0"
        df = self.db.select_dataframe(Q % filter_id)

        import lib.aho as aho
        checker = aho.AhoCorasick(list(df.filter_pattern)).has_match
        return checker
        
    

    @defer.inlineCallbacks
    def get_ts_only(self, advertiser,pattern_terms,num_days,logic="or",timeout=60,timeseries=False,filter_id=False):

        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates,num_days]

        #try:
        #    stats_df, url_stats_df = yield self.get_ts_cached(*args)
        #except:
        #    logging.info("Cache not present -- sampling instead")
        #    stats_df, url_stats_df = yield self.get_ts_sampled(*args)

        if not filter_id:
            try:
                stats_df = yield self.get_stats(*args[:-1])
            except:
                stats_df, url_stats_df, full_df = yield self.get_ts_sampled(*args)
        else:
            #args.append(False)
            
            logging.info("starting")
            stats_df, url_stats_df, full_df = yield self.get_ts_sampled(*args)
            aho_filter = yield self.get_filter_checker(filter_id)
            logging.info("constructed aho")
            value = { i: aho_filter(i.split("?")[1]) for i in set(full_df.url) }
            logging.info("ran aho")
            df = full_df[full_df.url.map(lambda x: value[x] )]
            logging.info("ran mask")
            stats_df = df.groupby("date").apply(self.calc_stats)
            logging.info("ran groupby")

           


        stats = stats_df#.join(url_stats_df).fillna(0)

        response = self.default_response(pattern_terms,logic,no_results=True)
        response = self.response_summary(response,stats)
        response = self.response_timeseries(response,stats)

        self.write_json(response)

    @defer.inlineCallbacks
    def get_uids_only(self, advertiser, pattern_terms, num_days, logic="or",timeout=60):

        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates]


        uids = yield self.get_uids_from_cache(*args)
        uids = list(set([u['uid'] for u in uids]))

        urls, raw_urls = yield self.defer_get_uid_visits(advertiser,uids,"adsf")
        df = raw_urls.groupby(["uid","date"])['source'].count().reset_index().groupby("uid")['source'].apply(lambda x: x.to_dict() )

        o1 = raw_urls.groupby(["uid"]).apply(lambda x: x.groupby("date")[['source']].count().rename(columns={"source":"visits"}).reset_index().to_dict("records") )
        _results = o1.reset_index().set_index("uid").rename(columns={0:"sessions"})
        results = _results.to_dict()

        response = self.default_response(pattern_terms,logic)
        response['results'] = results

        self.write_json(response)


    @defer.inlineCallbacks
    def get_domains(self, advertiser, pattern_terms, num_days, logic="or",timeout=60,timeseries=False):
        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates,num_days]

        stats_df, domain_stats_df, url_stats_df = yield self.get_generic_sampled(*args)
        domains = yield self.domain_stats_to_domains(domain_stats_df)

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

    def get_timeseries_only(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60,filter_id=False):
        self.get_ts_only(advertiser, pattern_terms, date_clause, logic, timeout, True, filter_id)
