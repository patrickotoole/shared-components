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

#SQL_SELECT = "select zipped from generic_function_cache where advertiser='%s' and url_pattern='%s' and filter_id=%s"
SQL_SELECT = "select zipped from transform_%s_cache where advertiser='%s' and url_pattern='%s' and filter_id=%s"
SQL_SELECT_V2 = "select zipped from generic_function_cache_v2 where udf = '%s' and advertiser='%s' and url_pattern='%s' and action_id=%s"

class VisitorTransformCacheHandler(VisitorBase):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.logging = logging
        self.db = db
        self.crushercache = crushercache

    @decorators.deferred
    def get_from_db(self, api_type, advertiser, pattern, filter_id):
        versioning = self.request.uri
        if versioning.find('v2') >=0:
            QUERY = SQL_SELECT_V2 % (api_type, advertiser, pattern, filter_id)
        else: 
            QUERY = SQL_SELECT % (api_type, advertiser, pattern, filter_id)
        logging.info("Making query")
        data = self.crushercache.select_dataframe(QUERY)
        hex_data = codecs.decode(data.ix[0]['zipped'], 'hex')
        logging.info("Decoded")
        decomp_data = zlib.decompress(hex_data)

        return decomp_data

    @custom_defer.inlineCallbacksErrors
    def first_step(self, api_type, advertiser, pattern, filter_id):
        data = yield self.get_from_db(api_type, advertiser, pattern, filter_id)
        self.write(ujson.loads(data))
        self.finish()

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self, api_type):
        advertiser = self.current_advertiser_name
        filter_id = self.get_argument("filter_id", 0)
        pattern = self.get_argument("url_pattern", False)
        filter_id = int(filter_id)
        self.first_step(api_type, advertiser, pattern, filter_id)
