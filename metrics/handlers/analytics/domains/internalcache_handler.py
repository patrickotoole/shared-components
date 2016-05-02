import tornado.web
import ujson
import pandas
import StringIO
import logging

import re

from link import lnk
from handlers.base import BaseHandler
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *
from base_domain_handler import BaseDomainHandler

class InternalCacheHandler(BaseDomainHandler):

    PackageModule = {
                        "domains" : "domain_cache_runner"
                    }

    def initialize(self, db=None, cassandra=None, zookeeper=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.zookeeper = zookeeper
        self.fn = self.get_domains

    def addToWorkQueue(self, fname):
        import ipdb; ipdb.set_trace()
        modul = __import__("lib.caching")
        full_modul = getattr(modul.caching, fname)
        func_call = getattr(full_modul, "runner")
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        work = pickle.dumps((
                func_call,
                [advertiser,segment["url_pattern"][0], base_url , _cache_yesterday,_cache_yesterday + "fullurlcache"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,0)
        logging.info("added to work queue %s for %s from HTTP request" %(segment["url_pattern"][0],advertiser))

        
    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        advertiser = self.current_advertiser_name
        terms = self.get_argument("url_pattern", False)
        filter_id = self.get_argument("filter_id",False)
        endpoint = self.get_argument("function",False)
        date = self.get_argument("date", False)

        self.addToWorkQueue(endpoint)
        self.write(ujson.dumps({"sample response": "Completed"}))
        self.finish()
