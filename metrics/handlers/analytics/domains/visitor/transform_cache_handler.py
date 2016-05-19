import sys

import tornado.web
import pandas
import logging
from twisted.internet import defer
from lib.helpers import decorators
import codecs
import zlib
import ujson
import lib.custom_defer as custom_defer
from ...search.pattern.base_visitors import VisitorBase

SQL_SELECT_V2 = "select zipped from generic_function_cache_v2 where udf = '%s' and advertiser='%s' and url_pattern='%s' and action_id=%s"
SQL_SELECT = "select zipped from generic_function_cache where udf='%s' and advertiser='%s' and url_pattern='%s' and action_id=%s and date='%s'"
ACTION_QUERY = "select action_id from action_with_patterns where pixel_source_name='{}' and url_pattern='{}'"
DATE_FALLBACK = "select distinct date from generic_function_cache where advertiser='%(advertiser)s' and url_pattern='%(url_pattern)s' and action_id=%(action_id)s and udf='%(udf)s' order by date DESC"

class VisitorTransformCacheHandler(VisitorBase):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.logging = logging
        self.db = db
        self.crushercache = crushercache

    def get_action_id(self, advertiser, pattern):
        action_id = self.db.select_dataframe(ACTION_QUERY.format(advertiser, pattern))
        return action_id['action_id'][0]

    def getRecentDate(self, advertiser, url_pattern, action_id, udf):
        query_dict = {"url_pattern":url_pattern, "advertiser":advertiser, "action_id": action_id, "udf": udf}
        datefallback = self.crushercache.select_dataframe(DATE_FALLBACK % query_dict)
        now_date = str(datefallback['date'][0])
        return now_date

    def now(self):
        from datetime import datetime
        today = datetime.today()
        return str(today).split(".")[0]

    @decorators.deferred
    def get_from_db(self, api_type, advertiser, pattern, filter_id, filter_date):
        now_date=filter_date
        if not filter_date:
            now_date = self.now()
        if not filter_id:
            filter_id = self.get_action_id(advertiser, pattern)
        
        versioning = self.request.uri
        if versioning.find('v2') >=0:
            QUERY = SQL_SELECT_V2 % (api_type, advertiser, pattern, filter_id)
        else: 
            QUERY = SQL_SELECT % (api_type, advertiser, pattern, filter_id, now_date)
        
        logging.info("Making query")

        data = self.crushercache.select_dataframe(QUERY)
        if len(data) ==0 and not filter_date:
            now_date = self.getRecentDate(advertiser, pattern, filter_id, api_type)
            QUERY = SQL_SELECT % (api_type, advertiser, pattern, filter_id, now_date)
            data = self.crushercache.select_dataframe(QUERY)

        try:
            hex_data = codecs.decode(data.ix[0]['zipped'], 'hex')
            logging.info("Decoded")
            decomp_data = zlib.decompress(hex_data)
        except:
            if filter_date:
                decomp_data = '{"error": "Data has not yet been cached for this function and date combination"}'
            else:
                decomp_data = '{"error": "Data has not yet been cached for this function"}'
            #raise Exception("Endpoint has not yet been cached")

        return decomp_data

    @custom_defer.inlineCallbacksErrors
    def first_step(self, api_type, advertiser, pattern, filter_id, filter_date):
        data = yield self.get_from_db(api_type, advertiser, pattern, filter_id, filter_date)
        details = self.get_details(advertiser, pattern, api_type)
        _resp = ujson.loads(data)
        if 'api_details' in _resp.keys():
            if type(_resp['api_details']):
                _resp['api_details']['cache_time_taken'] = details['time_to_cache']
                _resp['api_details']['date_of_cache'] = details['date_of_cache']
        else:
            _resp['api_details'] = details
        self.write(_resp)
        self.finish()

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self, api_type):
        advertiser = self.current_advertiser_name
        filter_id = self.get_argument("filter_id", False)
        pattern = self.get_argument("url_pattern", False)
        filter_date = self.get_argument("date",False)

        filter_id = int(filter_id)
        self.first_step(api_type, advertiser, pattern, filter_id, filter_date)
