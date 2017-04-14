import tornado.web
import ujson
import pandas
import logging

from handlers.base import BaseHandler
from handlers.analytics.analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
import lib.custom_defer as custom_defer

QUERY_ADVERTISER = "select pixel_source_name, valid_pixel_fires_yesterday from advertiser_caching"
QUERY_ADVERTISER_skip = "select pixel_source_name, valid_pixel_fires_yesterday from advertiser_caching where skip=0"
QUERY_SEGMENT = "select filter_id, pattern, data_populated from advertiser_caching_segment where pixel_source_name = '%s'"
QUERY_SEGMENT_skip = "select filter_id, pattern, data_populated from advertiser_caching_segment where pixel_source_name = '%s' and skip=0"

class AdvertiserDataHandler(AnalyticsBase, BaseHandler):
    def initialize(self, db=None, **kwargs):
        self.db = db


    def build_response(self,df,skip):
        resp ={}
        for i,advertiser in df.iterrows():
            Q = QUERY_SEGMENT_skip if skip else QUERY_SEGMENT
            pixel_name = advertiser['pixel_source_name']
            resp[pixel_name]={"has_data":advertiser['valid_pixel_fires_yesterday']}
            resp[pixel_name]['segment'] = self.db.select_dataframe(Q % pixel_name).to_dict('records')
        return resp

    @decorators.deferred
    def get_from_db(self,skip):
        if skip:
            df = self.db.select_dataframe(QUERY_ADVERTISER_skip)
        else:
            df = self.db.select_dataframe(QUERY_ADVERTISER)
        res=self.build_response(df,skip)
        return res


    @custom_defer.inlineCallbacksErrors
    def pull_and_aggregate(self,skip):
        data = yield self.get_from_db(skip)
        self.write(ujson.dumps(data))
        self.finish()

    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        skip = self.get_argument("skip",False)
        skip = True if skip else False
        self.pull_and_aggregate(skip)
