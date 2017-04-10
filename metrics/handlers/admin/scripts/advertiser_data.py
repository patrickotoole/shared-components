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
QUERY_SEGMENT = "select filter_id, pattern, data_populated from advertiser_caching_segment where pixel_source_name = '%s'"

class AdvertiserDataHandler(AnalyticsBase, BaseHandler):
    def initialize(self, db=None, **kwargs):
        self.db = db


    def build_response(self,df):
        resp ={}
        for advertiser in df.iterrows():
            resp[advertiser[1]['pixel_source_name']]={"has_data":advertiser[1]['valid_pixel_fires_yesterday']}
            resp[advertiser[1]['pixel_source_name']]['segments'] =self.db.select_dataframe(QUERY_SEGMENT % advertiser[1]['pixel_source_name']).to_dict('records')
        return resp

    @decorators.deferred
    def get_from_db(self):
        df = self.db.select_dataframe(QUERY_ADVERTISER)
        res=self.build_response(df)
        return res


    @custom_defer.inlineCallbacksErrors
    def pull_and_aggregate(self):
        data = yield self.get_from_db()
        self.write(ujson.dumps(data))
        self.finish()

    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        self.pull_and_aggregate()
