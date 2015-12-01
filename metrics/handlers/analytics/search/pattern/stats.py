import logging
import time
import pandas

from datetime import datetime

from twisted.internet import defer
from ..cache.pattern_search_cache import PatternSearchCache
from helpers import build_datelist, build_count_dataframe, build_dict_dataframe
from lib.helpers import *




class PatternStatsBase(PatternSearchCache):

    def get_stats_cached(self, *args):
        assert(len(args) >= 3)

        start = time.time()

        logging.info("Pattern %s | get_stats: start" % args[1])

        views_df   = self.get_views_from_cache(*args, formatter=build_count_dataframe("views"))
        visits_df  = self.get_visits_from_cache(*args, formatter=build_count_dataframe("visits"))
        uniques_df = self.get_uniques_from_cache(*args, formatter=build_count_dataframe("uniques"))

        logging.info("Pattern %s | get_stats: end" % args[1])
        logging.info("Pattern %s | get_stats time: %s" % (args[1], time.time() - start))

        return [views_df,visits_df,uniques_df]

    def get_stats_missing(self,missing_dates,*args):

        start = time.time()

        logging.info("Pattern %s | get_stats_missing: dates %s" % (args[1], len(missing_dates)))
        logging.info("Pattern %s | get_stats_missing: start" % (args[1]))

        views_df = "" # We dont need this because it is written directly...
        visits_df  = self.get_visits_from_cache_new(*args, formatter=build_count_dataframe("visits"))
        uniques_df = self.get_uniques_from_cache_new(*args, formatter=build_count_dataframe("uniques"))

        logging.info("Pattern %s | get_stats_missing: end" % (args[1])) 
        logging.info("Pattern %s | get_stats_missing time: %s" % (args[1], (time.time() - start)))

        return [visits_df,uniques_df]

    def get_missing_dates(self,all_dates,some_dates):
        missing_dates = [
            u"%s" % datetime.strptime(i,"%Y-%m-%d %H:%M:%S") for i in all_dates
            if i not in some_dates
        ] 
        return missing_dates

    @decorators.deferred
    def get_stats(self, *args):

        views_df, visits_df, uniques_df = self.get_stats_cached(*args)
        missing_dates = self.get_missing_dates(args[2],visits_df.index)

        for d in missing_dates:
            views_df.ix[d] = 0

        if missing_dates:
            visits_df, uniques_df = self.get_stats_missing(missing_dates,*args)

        df = views_df.join(visits_df).join(uniques_df)

        return df


    @decorators.deferred 
    def get_url_stats(self,*args):
        start = time.time()

        logging.info("Pattern %s | get_url_stats: start" % args[1])
        urls_df = self.get_urls_from_cache(*args, formatter=build_dict_dataframe("urls"))
        logging.info("Pattern %s | get_url_stats: end" % args[1])
        logging.info("Pattern %s | get_url_stats time: %s" % (args[1], (time.time() - start)))

        return urls_df

    @defer.inlineCallbacks
    def get_domain_stats_missing(self,*args):
        def get_uids(arr):
            return list(set([i['uid'] for i in arr]))
        
        start = time.time()
        logging.info("Pattern %s | get_domain_stats_missing uids: start" % args[1])

        _args = [args[0],args[1],args[2][:2]]
        uids = self.get_uids_from_cache(*_args, formatter=get_uids)
        logging.info("Pattern %s | get_domain_stats_missing uids: end" % args[1])
        logging.info("Pattern %s | get_domain_stats_missing uids time: %s" % (args[1],(time.time() - start)))


        logging.info("LEN UIDS: %s" % len(uids))
        uids = uids[:1000]
        logging.info("USING UIDS: %s" % len(uids))


        start = time.time()
        logging.info("Pattern %s | get_domain_stats_missing domains: start" % args[1])

        advertiser = args[0]
        pattern = args[1]
        num_days = len(args[2])

        defs = [self.defer_get_domains_by_date(advertiser,pattern,uids,num_days)]
        dl = defer.DeferredList(defs)
        dom = yield dl

        logging.info("Pattern %s | get_domain_stats_missing uids: end" % args[1])
        logging.info("Pattern %s | get_domain_stats_missing uids time: %s" % (args[1],(time.time() - start)))


        domains = dom[0][1]
        domains = domains.groupby("date").apply(lambda x: list(x[['count','domain']].T.to_dict().values()))
        domains = pandas.DataFrame({"domains":domains})

        defer.returnValue(domains)

    @defer.inlineCallbacks
    def get_domain_stats(self,*args):
        start = time.time()

        logging.info("Pattern %s | get_domain_stats: start" % args[1])
        domains_df = yield self.get_domains_from_cache(*args, formatter=build_dict_dataframe("domains"))
        logging.info("Pattern %s | get_domain_stats: end" % args[1])
        logging.info("Pattern %s | get_domain_stats time: %s" % (args[1], (time.time() - start)))

        data_missing = (len(domains_df) == 0)

        if data_missing:
            domains_df = yield self.get_domain_stats_missing(*args)


        defer.returnValue(domains_df)

