import tornado.web
import ujson
import pandas
import StringIO
import logging
import pickle, work_queue
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
                        "domains" : "domain_cache_runner",
                        "domains_full": "domains_full_runner",
                        "keyword": "keyword_cache",
                        "before_and_after": "module_cache_runner",
                        "hourly": "module_cache_runner",
                        "sessions": "module_cache_runner",
                        "model": "module_cache_runner",
                        "onsite": "uids_only_cache",
                        "backfill": "",
                        "recurring": ""
                    }

    def initialize(self, db=None, cassandra=None, zookeeper=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.zookeeper = zookeeper
        self.fn = self.get_domains

    def addToWorkQueue(self, fname, advertiser, pattern, filter_id):
        base_url="http://beta.crusher.getrockerbox.com"
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        ArgsModule ={
                    "domains" : [advertiser,pattern, False, base_url , _cache_yesterday,_cache_yesterday + "domainsfromUser"],
                    "domains_full": [advertiser,pattern, base_url, _cache_yesterday, _cache_yesterday+"full_urlUser"],
                    "keyword":[advertiser,pattern,base_url, _cache_yesterday, _cache_yesterday+"keyworduser"],
                    "before_and_after":[advertiser,pattern, "before_and_after", filter_id, base_url, _cache_yesterday,_cache_yesterday + "bnamoduleUser"],
                    "hourly": [advertiser,pattern, "hourly", filter_id, base_url, _cache_yesterday,_cache_yesterday + "HourmodulecacheUser"],
                    "sessions": [advertiser,pattern, "sessions", filter_id, base_url, _cache_yesterday,_cache_yesterday + "ModelmodulecacheUser"],
                    "model": [advertiser,pattern, "model", filter_id, base_url, _cache_yesterday,_cache_yesterday + "OnsitemodulecacheUser"],
                    "onsite": [advertiser,pattern, base_url, _cache_yesterday, _cache_yesterday + "uids_onlyUser"],
                    "backfill": [],
                    "recurring":[]
                }

        modul = __import__("lib.caching")
        full_modul = getattr(modul.caching, self.PackageModule[fname])
        func_call = getattr(full_modul, "runner")
        
        fargs = ArgsModule[fname]
        
        work = pickle.dumps((
                func_call,
                fargs
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,1)
        logging.info("added to work queue %s for %s from HTTP request" %(pattern,advertiser))

        
    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        advertiser = self.current_advertiser_name
        terms = self.get_argument("url_pattern", False)
        filter_id = self.get_argument("filter_id",0)
        endpoint = self.get_argument("function",False)
        date = self.get_argument("date", False)

        if not terms:
            raise Exception("Must include url_pattern parameter")

        self.addToWorkQueue(endpoint, advertiser, terms, filter_id)
        self.write(ujson.dumps({"sample response": "Completed"}))
        self.finish()
