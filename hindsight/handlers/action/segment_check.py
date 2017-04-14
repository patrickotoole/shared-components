import tornado.web
import ujson
import pandas
import logging

from handlers.base import BaseHandler
from twisted.internet import defer
from lib.helpers import decorators
import lib.custom_defer as custom_defer

QUERY_ADVERTISER = "select pixel_source_name, valid_pixel_fires_yesterday from advertiser_caching where pixel_source_name= '%s'"
QUERY_ADVERTISER_skip = "select pixel_source_name, valid_pixel_fires_yesterday from advertiser_caching where skip=0 and pixel_source_name = '%s'"
QUERY_SEGMENT = "select filter_id, pattern, data_populated from advertiser_caching_segment where pixel_source_name = '%s'"
QUERY_SEGMENT_skip = "select filter_id, pattern, data_populated from advertiser_caching_segment where pixel_source_name = '%s' and skip=0"

class SegmentCheckHandler(BaseHandler):
    def initialize(self, db=None, **kwargs):
        self.db = db


    def build_response(self,df,skip):
        resp ={}
        for advertiser in df.iterrows():
            resp[advertiser[1]['pixel_source_name']]={"has_data":advertiser[1]['valid_pixel_fires_yesterday']}
            if skip:
                resp[advertiser[1]['pixel_source_name']]['segments'] =self.db.select_dataframe(QUERY_SEGMENT_skip % advertiser[1]['pixel_source_name']).to_dict('records')
            else:
                resp[advertiser[1]['pixel_source_name']]['segments'] =self.db.select_dataframe(QUERY_SEGMENT % advertiser[1]['pixel_source_name']).to_dict('records')
        return resp

    @decorators.deferred
    def get_from_db(self,skip, advertiser):
        if skip:
            df = self.db.select_dataframe(QUERY_ADVERTISER_skip % advertiser)
        else:
            df = self.db.select_dataframe(QUERY_ADVERTISER % advertiser)
        res=self.build_response(df,skip)
        return res


    @custom_defer.inlineCallbacksErrors
    def pull_and_aggregate(self,skip,advertiser):
        data = yield self.get_from_db(skip,advertiser)
        self.write(ujson.dumps(data))
        self.finish()

    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        skip = self.get_argument("skip",False)
        advertiser = self.current_advertiser_name
        skip = True if skip else False
        self.pull_and_aggregate(skip,advertiser)
