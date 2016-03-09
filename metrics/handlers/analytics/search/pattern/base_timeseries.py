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
from generic import *

class TimeseriesBase(GenericSearchBase):


    @defer.inlineCallbacks
    def get_ts_cached(self,advertiser,term,dates,num_days,filter_id=False):
        args = [advertiser,term,dates]

        stats_df, url_stats_df = yield self.get_page_stats(*args)

        # DO THE FILTER IF THERE IS A FILTER
        if filter_id:
            pass

        defer.returnValue([stats_df, url_stats_df])



    @defer.inlineCallbacks
    def get_ts_only(self, advertiser,pattern_terms,num_days,filter_id=False):

        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates,num_days,True,filter_id]

        try:
            if filter_id: raise Exception("Using sample so that we can filter")
            stats_df = yield self.get_stats(*args[:-3])
        except Exception as e:
            logging.info(e)
            _, stats_df, url_stats_df, full_df = yield self.get_sampled(*args)
            

        stats = stats_df

        response = self.default_response(pattern_terms,"filtered",no_results=True)
        response = self.response_summary(response,stats)
        response = self.response_timeseries(response,stats)

        self.write_json(response)


    def get_timeseries_only(self, advertiser, pattern_terms, date_clause, process=False,filter_id=False, **kwargs):
        self.get_ts_only(advertiser, pattern_terms, date_clause, filter_id)
