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
        self.zk = zookeeper
        self.required_cols = ["advertiser", "action_name", "operator"]
    

    def get_stats(self):
        advertiser = self.get_argument("advertiser", self.current_advertiser_name)
        pattern = self.get_argument("pattern",False)

        SQL = "SELECT * FROM pattern_cache where url_pattern =  '%s' and pixel_source_name = '%s'"

        try:
            results = self.db.select_dataframe(SQL % (pattern,advertiser))
            self.write_response(Convert.df_to_values(results))
        except Exception, e:
            self.write_response(str(e),e)

    def run_pattern(self):
        advertiser = self.get_argument("advertiser", self.current_advertiser_name)
        pattern = self.get_argument("pattern",False)
        index_num = int(self.get_argument("num_days",0))

        SQL = "SELECT * FROM pattern_cache where url_pattern =  '%s' and pixel_source_name = '%s' and num_days = %s"

        try:
            results = self.db.select_dataframe(SQL % (pattern,advertiser,index_num))
            first = results.iloc[0]
            date_to_run = first.timestamp.to_datetime() - datetime.timedelta(days=index_num+1)
            delta = datetime.datetime.now() - date_to_run
            args = [advertiser,pattern,1,delta.days,True]
            work = (cache.run_force,args)

            work_queue.SingleQueue(self.zk,"python_queue").put(pickle.dumps(work),0)

            self.write_response(Convert.df_to_values(results))

        except Exception, e:
            self.write_response(str(e),e)

 
        

    @tornado.web.authenticated
    def get(self,argument=False):

        if argument == "status":
            self.get_stats()
        else:
            self.run_pattern()

