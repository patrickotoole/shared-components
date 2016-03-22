import sys

import tornado.web
import pandas
import logging
from twisted.internet import defer
from lib.helpers import decorators
import codecs
import zlib
from ...search.pattern.base_visitors import VisitorBase

SQL_SELECT = "select zipped from %s_cache where advertiser=%s and url_pattern=%s and filter_id=%s"

class VisitorTransformCacheHandler(VisitorBase):

    def initialize(self, db=None, **kwargs):
        self.logging = logging
        self.db = db

    @decorators.deferred
    def get_from__db(api_type, advertiser, pattern, filter_id):
        QUERY = SQL_SELECT % (api_type, advertiser, pattern, filter_id)
        data = self.db.select_dataframe(QUERY)
        hex_data = codecs.decode(data.ix[0]['zipped'], 'hex')
        decomp_data = zlib.decompress(hex_data)

        return decomp_data

    @decorators.inlineCallbackErrors
    def first_step(api_type, advertiser, patter, fiter_id):

        data = yield get_from_db(api_type, advertiser, patterb, filter_id)
        self.get_content(data)

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self, api_type):
        advertiser = self.current_advertiser_name
        filter_id = self.get_argument("filter_id", 0)
        pattern = self.get_argument("url_pattern", False)

        
