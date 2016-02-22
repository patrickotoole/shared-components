import tornado.web
import ujson
import pandas
import StringIO
import logging

import re

from ..base import BaseHandler
from analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.caching import cache_uid_cassandra as cc
from kazoo.client import KazooClient
import pickle
import lib.caching.cache_uid_wrapper as cc


class FullURLCache(BaseHandler,AnalyticsBase):
    
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None


    def get(self):    

        try:
            advertiser = self.current_advertiser_name
            pattern = self.get_argument("pattern", "")
            work = pickle.dumps((
                cc.add_to_table,
                [advertiser,pattern]
                ))

            self.write("Success")
            self.finish()
        except:
            self.write("Fail")
            self.finish()


