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

class FullURLCache(BaseHandler,AnalyticsBase):
    
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None

    @decorators.deferred
    def defer_get_onsite_domains(self, date, advertiser, pattern):
        dates = build_datelist(7)
        args = [advertiser,pattern,dates]

        uids = self.get_uids_from_cache(*args)
        uids = list(set([u['uid'] for u in uids]))

        crusher_api = lnk.api.crusher
        crusher_api.user="a_"+advertiser
        crusher_api.password="admin"
        crusher_api.base_url="http://192.168.99.100:8888"
        crusher_api.authenticate()

        data_obj = {"uids":uids}
        response_data = crusher_api.post('/crusher/visit_domains_full?format=json&aggregate=True', data = ujson.dumps(data_obj))

        return response_data.text


    @defer.inlineCallbacks
    def run_onsite_domains(self, date, kind, advertiser, pattern):

        response_data = yield self.defer_get_onsite_domains(date, advertiser, pattern)

        df = pandas.DataFrame(ujson.loads(response_data))
        self.get_content(df)



    def get(self):    

        try:
            advertiser = self.current_advertiser_name
            pattern = self.get_argument("pattern", "")
            
            #in new asynch function
            #work = pickle.dumps((
            #cache.run_recurring,
            #[advertiser,pattern,_cache_date, _cache_date + " domain_cache"]
            #))
            #cfu.factoryPattern() 

            self.write("Success")
            self.finish()
        except:
            self.write("Fail")
            self.finish()


