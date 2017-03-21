import sys

import tornado.web
import pandas
import logging
from twisted.internet import defer
from handlers.helpers import decorators, Render
import codecs
import zlib
import ujson
import handlers.custom_defer as custom_defer
from handlers.base import *
from database import *

SQL_SELECT_V2 = "select zipped from generic_function_cache_v2 where udf = '%s' and advertiser='%s' and url_pattern='%s' and action_id=%s"
SQL_SELECT = "select zipped from generic_function_cache where udf='%s' and advertiser='%s' and url_pattern='%s' and action_id=%s and date='%s'"
ACTION_QUERY = "select action_id from action_with_patterns where pixel_source_name='{}' and url_pattern='{}'"
DATE_FALLBACK = "select distinct date from generic_function_cache where advertiser='%(advertiser)s' and url_pattern='%(url_pattern)s' and action_id=%(action_id)s and udf='%(udf)s' order by date DESC"

class CacheHandler(BaseHandler,CacheDatabase,Render):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.logging = logging
        self.db = db
        self.crushercache = crushercache


    @custom_defer.inlineCallbacksErrors
    def first_step(self, api_type, advertiser, pattern, filter_id, filter_date):
        data = yield self.get_from_db(api_type, advertiser, pattern, filter_id, filter_date)
        _resp = ujson.loads(data)
        self.compress(ujson.dumps(_resp))

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
