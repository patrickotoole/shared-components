import tornado.web
import ujson
import pandas
import logging
import datetime 

from handlers.base import BaseHandler
from handlers.analytics.analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
import lib.custom_defer as custom_defer

QUERY_ADVERTISER = "select pixel_source_name, pixel_fires,date from advertiser_pixel_fires where date > '%s' group by pixel_source_name, date"
QUERY_SEGMENT = "select filter_id, url_pattern, pixel_fires,date from advertiser_segment_check where pixel_source_name = '%s' and date > '%s' group by pixel_source_name, filter_id, date"

class AdvertiserDataTimeseriesHandler(AnalyticsBase, BaseHandler):
    def initialize(self, crushercache=None, db=None, **kwargs):
        self.crushercache = crushercache
        self.db = db

    def build_response(self,df,date):
        resp ={}
        for i,advertiser in df.iterrows():
            pixel_name = advertiser['pixel_source_name']
            resp[pixel_name]={"has_data":advertiser['pixel_fires']}
            adv_df = self.crushercache.select_dataframe(QUERY_SEGMENT % (pixel_name,date))
            adv_df['date'] = adv_df.date.apply(lambda x : str(x))
            resp[pixel_name]['segments'] =adv_df.to_dict('records')
        return resp

    @decorators.deferred
    def get_from_db(self, days_ago):
        date = (datetime.datetime.now() - datetime.timedelta(days=days_ago)).strftime("%Y-%m-%d") 
        df = self.crushercache.select_dataframe(QUERY_ADVERTISER % date)
        res=self.build_response(df,date)
        return res


    @custom_defer.inlineCallbacksErrors
    def pull_and_aggregate(self, days_ago):
        data = yield self.get_from_db(days_ago)
        self.write(ujson.dumps(data))
        self.finish()

    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        days_ago = int(self.get_argument("num_days", 2))
        self.pull_and_aggregate(days_ago)
