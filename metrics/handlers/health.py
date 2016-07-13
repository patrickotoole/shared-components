import tornado.web
import ujson
from lib.kafka_queue import kafka_queue
import lib.custom_defer as custom_defer

from twisted.internet import defer
from lib.helpers import *
from base import BaseHandler

import mocks.cassandra
from datetime import datetime, timedelta

class HealthHandler(BaseHandler):

    def initialize(self,db=None,cassandra=None,spark_sql=None):
        self.db = db
        self.cassandra = cassandra
        self.spark_sql = spark_sql
        
    @decorators.deferred
    def check_buffers(self):
        what_to_write = '0'
        if self.db is None:
            what_to_write = '0'
        else:
            bools = {
                key: 1 if value and (value > (datetime.now() - timedelta(seconds=60))) else 0
                for key,value in kafka_queue.ACTIVE_QUEUES.items() 
            }
            what_to_write = ujson.dumps(bools)
        return what_to_write
 
    @decorators.deferred
    def check_mysql(self):
        what_to_write = '0'
        if self.db is None:
            what_to_write = '0'
        else:
            df = self.db.select_dataframe("select 1 status from advertiser")
            d = Convert.df_to_values(df)[0]
            if ujson.dumps(d['status'])=='1':
                what_to_write = '1'
            else:
                what_to_write = '1'
        return what_to_write

    @decorators.deferred    
    def check_spark_sql(self):
        what_to_write= '0'
        if self.spark_sql is None:
            what_to_write = '0'
        else:
            df = self.spark_sql.select_dataframe("select 1 status from advertiser_ref limit 1")
            d = Convert.df_to_values(df)[0]
            if ujson.dumps(d['status'])=='1':
                what_to_write = '1'
            else:
                what_to_write = '0'
        return what_to_write
    
    @decorators.deferred 
    def check_cassandra(self):
        what_to_write = '0'
        if self.cassandra is mocks.cassandra.CASSANDRA:
            what_to_write = '0'
        else:
            try:
                df = self.cassandra.select_dataframe("SELECT * FROM rockerbox.visitor_domains_full limit 1")
                if len(df) == 1:
                    what_to_write = '1'
            except:
                what_to_write = '0'
        return what_to_write

    @custom_defer.inlineCallbacksErrors
    def run_check(self, check_to_run):
        what_to_write = yield check_to_run(self)
        self.write(what_to_write)
        self.finish()

    @tornado.web.asynchronous
    def get(self,meta=""):
        check = "check_%s" % meta
        fn = self.__class__.__dict__.get(check,False)
        if fn:
            self.run_check(fn)
        else:
            self.write('0')
            self.finish() 
