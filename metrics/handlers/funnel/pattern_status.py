import datetime
import tornado.web
import ujson
import pandas

from handlers.base import BaseHandler
from lib.helpers import Convert
from lib.helpers import APIHelpers

import work_queue
import lib.cassandra_cache.pattern as cache
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
    

    def get_stats(self):
        advertiser = self.get_argument("advertiser", self.current_advertiser_name)
        pattern = self.get_argument("pattern",False)

        try:
            results = self.get_pattern_cache(advertiser,pattern)

            zk_stats = zk_helpers.ZKCacheHelpers(self.zookeeper,advertiser,pattern,"")
            active = zk_stats.active_stats()
            queued = zk_stats.pattern_queue_stats()
            

            mask_fn = lambda x: str(x).split()[0] in  active.identifier.values
            results['active'] = results.cache_date.map(mask_fn) & (results.completed == 0)

            import ipdb; ipdb.set_trace()


            self.write_response(Convert.df_to_values(results))
        except Exception, e:
            self.write_response(str(e),e)

    def run_pattern(self):
        advertiser = self.get_argument("advertiser", self.current_advertiser_name)
        pattern = self.get_argument("pattern",False)

        _cache_date = self.get_argument("cache_date",False)
        cache_date = datetime.datetime.strptime(_cache_date,"%Y-%m-%d")
        delta = datetime.datetime.now() - cache_date

        try:
            work = pickle.dumps((
                cache.run_force,
                [advertiser,pattern,1,delta.days -1,True]
            ))

            work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,0)

            self.write_response(Convert.df_to_values(results))

        except Exception, e:
            self.write_response(str(e),e)

 
        

    @tornado.web.authenticated
    def get(self,argument=False):

        if argument == "status":
            self.get_stats()
        else:
            self.run_pattern()

