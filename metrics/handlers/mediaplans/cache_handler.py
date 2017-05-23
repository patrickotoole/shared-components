import sys

import tornado.web
import pandas
import logging
from twisted.internet import defer
from lib.helpers import decorators, Render
import codecs
import zlib
import ujson
import lib.custom_defer as custom_defer
from handlers.base import *

SQL_SELECT = "select zipped from yoshi_cache where advertiser='%s' and name='%s' and action_id=%s and date='%s'"
DATE_FALLBACK = "select distinct date from yoshi_cache where advertiser='%(advertiser)s' and action_id=%(action_id)s and name='%(name)s' order by date DESC"

class MediaplanCacheHandler(BaseHandler,Render):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.logging = logging
        self.db = db
        self.crushercache = crushercache

    def getRecentData(self, advertiser, action_id, name):
        query_dict = {"advertiser":advertiser, "action_id": action_id, "name": name}
        datefallback = self.crushercache.select_dataframe(DATE_FALLBACK % query_dict)
        now_date = str(datefallback['date'][0])
        return now_date

    def now(self):
        from datetime import datetime
        today = datetime.today()
        return str(today).split(".")[0]

    @decorators.deferred
    def get_from_db(self, advertiser, filter_id, filter_date, name):
        now_date=filter_date
        if not filter_date:
            now_date = self.now()
            now_date = self.getRecentData(advertiser, filter_id, name)

        QUERY = SQL_SELECT % (advertiser, name, filter_id, now_date)

        logging.info("Making query")

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
    def first_step(self, advertiser, filter_id, filter_date, filter_name):
        data = yield self.get_from_db(advertiser, filter_id, filter_date, filter_name)
        _resp = ujson.loads(data)
        self.compress(ujson.dumps(_resp))

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        advertiser = self.current_advertiser_name
        filter_id = self.get_argument("filter_id", False)
        filter_date = self.get_argument("date",False)
        filter_name = self.get_argument("name",False)

        filter_id = int(filter_id)
        self.first_step(advertiser, filter_id, filter_date, filter_name)
