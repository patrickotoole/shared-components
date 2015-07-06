import tornado.web
import ujson

from twisted.internet import defer
from lib.helpers import *
from base import BaseHandler

class HealthHandler(BaseHandler):

    def initialize(self,db=None,cassandra=None,spark_sql=None):
        self.db = db
        self.cassandra = cassandra
        self.spark_sql = spark_sql
        

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
        if self.cassandra is None: self.write('{"status":0}')
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
