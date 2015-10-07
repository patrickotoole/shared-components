import datetime
import tornado.web
import ujson
import pandas

from handlers.base import BaseHandler
from lib.helpers import Convert
from lib.helpers import APIHelpers

import work_queue
import lib.cassandra_cache.pattern as cache
import pickle


 
class PatternStatusHandler(BaseHandler,APIHelpers):

    def initialize(self, db=None, zookeeper=None, **kwargs):
        self.db = db 
        self.zookeeper = zookeeper
        self.required_cols = ["advertiser", "action_name", "operator"]
    

    def get_stats(self):
        advertiser = self.get_argument("advertiser", self.current_advertiser_name)
        pattern = self.get_argument("pattern",False)

        SQL = "SELECT * FROM pattern_cache where url_pattern =  '%s' and pixel_source_name = '%s' and deleted = 0"

        try:
            results = self.db.select_dataframe(SQL % (pattern,advertiser))

            try:
                name = advertiser + "=" + pattern.replace("/","|")
                full_name = "/active_pattern_cache/" + name
                children = self.zookeeper.get_children(full_name)

                results['active'] = results.cache_date.map(lambda x: str(x).split()[0] in children)
            except:
                pass

            self.write_response(Convert.df_to_values(results))
        except Exception, e:
            self.write_response(str(e),e)

    def run_pattern(self):
        advertiser = self.get_argument("advertiser", self.current_advertiser_name)
        pattern = self.get_argument("pattern",False)
        _cache_date = self.get_argument("cache_date",False)

        cache_date = datetime.datetime.strptime(_cache_date,"%Y-%m-%d")
        cache_date_max = cache_date + datetime.timedelta(days=1)
        SQL = """
            SELECT * from pattern_cache 
            where url_pattern = '%s' and pixel_source_name ='%s' and cache_date >= '%s' and cache_date < '%s'
        """ 

        try:
            results = self.db.select_dataframe(SQL % (pattern,advertiser,cache_date,cache_date_max))
            name = advertiser + "=" + pattern.replace("/","|")
            children = self.zookeeper.get_children("/active_pattern_cache")

            if name in children:
                pass
            else:
                self.zookeeper.create("/active_pattern_cache/" + name)
                self.zookeeper.create("/complete_pattern_cache/" + name)

            full_name = "/active_pattern_cache/" + name + "/" + _cache_date

            delta = datetime.datetime.now() - cache_date
            args = [advertiser,pattern,1,delta.days -1,True,full_name]
            work = (cache.run_force,args)

            work_queue.SingleQueue(self.zookeeper,"python_queue").put(pickle.dumps(work),0)

            self.write_response(Convert.df_to_values(results))

        except Exception, e:
            self.write_response(str(e),e)

 
        

    @tornado.web.authenticated
    def get(self,argument=False):

        if argument == "status":
            self.get_stats()
        else:
            self.run_pattern()

