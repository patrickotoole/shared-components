import datetime
import tornado.web
import ujson
import pandas

from handlers.base import BaseHandler
from lib.helpers import Convert
from lib.helpers import APIHelpers

import work_queue
import lib.cassandra_cache.pattern as cache
import lib.cassandra_cache.run_domains as domain_cache
import lib.cassandra_cache.run_uniques as unique_cache
import lib.cassandra_cache.zk_helpers as zk_helpers

import pickle

class PatternDatabase(object):
    
    def get_pattern_cache(self,advertiser,pattern):

        SQL = "SELECT * FROM pattern_cache where url_pattern =  '%s' and pixel_source_name = '%s' and deleted = 0"
        results = self.db.select_dataframe(SQL % (pattern,advertiser))

        return results
 
 
class PatternStatusHandler(BaseHandler,APIHelpers,PatternDatabase):

    def initialize(self, db=None, zookeeper=None, **kwargs):
        self.db = db 
        self.zookeeper = zookeeper
        self.required_cols = ["advertiser", "action_name", "operator"]
        self.queue = "python_queue"
    

    def get_stats(self,advertiser,pattern):

        results = self.get_pattern_cache(advertiser,pattern)

        zk_stats = zk_helpers.ZKCacheHelpers(self.zookeeper,advertiser,pattern,"")

        try:
            active = zk_stats.active_stats()
            mask_fn = lambda x: str(x).split()[0] in active.identifier.values

            results['active'] = results.cache_date.map(mask_fn) & (results.completed == 0)
        except:
            pass

        try:
            queued = zk_stats.pattern_queue_stats()
            queued_params = queued[queued['function'] == str(cache.run_one)].params
            queued_dates = queued_params.map(lambda x: str(x[-1]).split()[0])
            queued_fn = lambda x: str(x).split()[0] in queued_dates.values
            
            results['queued'] = results.cache_date.map(queued_fn) & (results.completed == 0)
        except:
            pass

        self.write_response(Convert.df_to_values(results))
            

    def run_domains(self,advertiser,pattern,cache_date):
        
        delta = datetime.datetime.now() - cache_date
        _cache_date = datetime.datetime.strftime(cache_date,"%Y-%m-%d")

        work = pickle.dumps((
            domain_cache.run_domains,
            [advertiser,pattern,1,delta.days -1,True,_cache_date + " domain_cache"]
        ))

        work_queue.SingleQueue(self.zookeeper,self.queue).put(work,0)
        df = pandas.DataFrame([])
        self.write_response(Convert.df_to_values(df))

    def run_uniques(self,advertiser,pattern,cache_date):
        
        delta = datetime.datetime.now() - cache_date
        _cache_date = datetime.datetime.strftime(cache_date,"%Y-%m-%d")

        work = pickle.dumps((
            unique_cache.run_uniques,
            [advertiser,pattern,1,delta.days -1,True,_cache_date + " unique_cache"]
        ))

        work_queue.SingleQueue(self.zookeeper,self.queue).put(work,0)
        df = pandas.DataFrame([])
        self.write_response(Convert.df_to_values(df))





    def run_pattern(self,advertiser,pattern,cache_date):
        
        delta = datetime.datetime.now() - cache_date
        _cache_date = datetime.datetime.strftime(cache_date,"%Y-%m-%d")

        work = pickle.dumps((
            cache.run_one,
            [advertiser,pattern,1,delta.days -1,True,_cache_date]
        ))

        work_queue.SingleQueue(self.zookeeper,self.queue).put(work,0)
        df = pandas.DataFrame([])
        self.write_response(Convert.df_to_values(df))
        
    def remove_queue(self,advertiser,pattern,cache_date):

        # TODO: This is wrong and needs to search through the queued items and find it based 
        # on the date in the pickled object
        
        zk_stats = zk_helpers.ZKCacheHelpers(self.zookeeper,advertiser,pattern,"")
        df = zk_stats.pattern_queue_stats()

        to_delete = df[
            (df["advertiser"] == advertiser) & 
            (df["pattern"] == pattern) & 
            (df["params"].map(lambda x: x[-1]) == cache_date)
        ]

        for name in to_delete['name'].values:
            self.zookeeper.delete("%s/%s" % (self.queue,name))

    def stop_job(self,advertiser,pattern,cache_date):
        zk_stats = zk_helpers.ZKCacheHelpers(self.zookeeper,advertiser,pattern,cache_date)
        zk_stats.destroy_active()

    @tornado.web.authenticated
    def get(self,argument=False):
        advertiser = self.get_argument("advertiser", self.current_advertiser_name)
        pattern = self.get_argument("pattern",False)

        _cache_date = self.get_argument("cache_date",False)
        if _cache_date:
            cache_date = datetime.datetime.strptime(_cache_date,"%Y-%m-%d")

        if argument == "status":
            self.get_stats(advertiser,pattern)
        elif argument == "run":
            self.run_pattern(advertiser,pattern,cache_date)
        elif argument == "run_domains":
            self.run_domains(advertiser,pattern,cache_date)
        elif argument == "run_uniques":
            self.run_uniques(advertiser,pattern,cache_date)
        elif argument == "clear":
            self.remove_queue(advertiser,pattern,cache_date)
        elif argument == "reset":
            self.stop_job(advertiser,pattern,cache_date)
