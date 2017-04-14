import tornado.web
import ujson
import pandas
import logging

from handlers.base import BaseHandler
from handlers.analytics.analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
import lib.custom_defer as custom_defer

QUERY_ADVERTISER = "select pixel_source_name, pixel_fires,date from advertiser_pixel_fires"
QUERY_SEGMENT = "select filter_id, url_pattern, pixel_fires,date from advertiser_segment_check where pixel_source_name = '%s'"

class AdvertiserDataTimeseriesHandler(AnalyticsBase, BaseHandler):
    def initialize(self, crushercache=None, db=None, **kwargs):
        self.crushercache = crushercache
        self.db = db

    def build_response(self,df):
        resp ={}
        for advertiser in df.iterrows():
            resp[advertiser[1]['pixel_source_name']]={"has_data":advertiser[1]['pixel_fires']}
            adv_df = self.crushercache.select_dataframe(QUERY_SEGMENT % advertiser[1]['pixel_source_name'])
            adv_df['date'] = adv_df.date.apply(lambda x : str(x))
            resp[advertiser[1]['pixel_source_name']]['segments'] =adv_df.to_dict('records')
        return resp

    @decorators.deferred
    def get_from_db(self):
        df = self.crushercache.select_dataframe(QUERY_ADVERTISER)
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