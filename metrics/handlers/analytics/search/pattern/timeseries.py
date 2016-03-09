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

from lib.aho import AhoCorasick
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *
from generic import *

class FilterBase(GenericSearchBase):

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

class TimeseriesBase(FilterBase):


    @defer.inlineCallbacks
    def get_ts_cached(self,advertiser,term,dates,num_days,filter_id=False):
        args = [advertiser,term,dates]

        stats_df, url_stats_df = yield self.get_page_stats(*args)

        # DO THE FILTER IF THERE IS A FILTER
        if filter_id:
            pass

        defer.returnValue([stats_df, url_stats_df])

    @defer.inlineCallbacks
    def get_ts_sampled(self,advertiser,term,dates,num_days,allow_sample=True,filter_id=False):
        sample_args = [term,"",advertiser,dates,num_days,allow_sample]

        df, stats_df, url_stats_df, full_df = yield self.sample_stats_onsite(*sample_args)

        if filter_id:
            stats_df, url_stats_df, full_df = yield self.filter_and_build(full_df,dates,filter_id)

        defer.returnValue([stats_df, url_stats_df, full_df])


    @defer.inlineCallbacks
    def get_ts_only(self, advertiser,pattern_terms,num_days,filter_id=False):

        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates,num_days]

        try:
            if filter_id: raise Exception("Using sample so that we can filter")
            stats_df = yield self.get_stats(*args[:-1])
        except Exception as e:
            logging.info(e)
            args.append(True)
            args.append(filter_id)
            stats_df, url_stats_df, full_df = yield self.get_ts_sampled(*args)
            

        stats = stats_df

        response = self.default_response(pattern_terms,"filtered",no_results=True)
        response = self.response_summary(response,stats)
        response = self.response_timeseries(response,stats)

        self.write_json(response)


    def get_timeseries_only(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60,filter_id=False):
        self.get_ts_only(advertiser, pattern_terms, date_clause, filter_id)
