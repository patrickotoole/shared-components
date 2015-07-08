import tornado.web
import ujson
from lib.kafka_queue import kafka_queue

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
        

    def check_buffers(self):
        if self.db is None: self.write('{"status":0}')
        else:
            bools = {
                key: 1 if value and (value > (datetime.now() - timedelta(seconds=60))) else 0
                for key,value in kafka_queue.ACTIVE_QUEUES.items() 
            }
            self.write(ujson.dumps(bools))
        self.finish()
 

    def check_mysql(self):
        if self.db is None: self.write('{"status":0}')
        else:
            df = self.db.select_dataframe("select 1 status from advertiser")
            d = Convert.df_to_values(df)[0]
            self.write(ujson.dumps(d))
        self.finish()
        
    def check_spark_sql(self):
        if self.spark_sql is None: self.write('{"status":0}')
        else:
            df = self.spark_sql.select_dataframe("select 1 status from advertiser_ref limit 1")
            d = Convert.df_to_values(df)[0]
            self.write(ujson.dumps(d))
        self.finish()
         
    def check_cassandra(self):
        if self.cassandra is mocks.cassandra.CASSANDRA: self.write('{"status":0}')
        else:
            df = self.cassandra.select_dataframe("SELECT * FROM rockerbox.visitor_domains limit 1")
            if len(df) == 1: self.write('{"status":1}')
        self.finish()
        
    @tornado.web.asynchronous
    def get(self,meta=""):
       check = "check_%s" % meta
       fn = self.__class__.__dict__.get(check,False)
       if fn:
           fn(self)
           return 

       self.write('{"status":0}')
       self.finish() 
