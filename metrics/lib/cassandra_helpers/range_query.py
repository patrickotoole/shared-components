import logging
import random
from statement import CassandraStatement
from helpers import FutureHelpers

class CassandraRangeQuery(CassandraStatement):
    
    SAMPLE_SIZES = [(1,2),(2,6),(5,21),(21,51),(51,100),(0,1)]

    def run_random_range(self,data,start,end,callback,*args,**kwargs):
        statement = kwargs.get("statement", None) or self.default_statement
        execute = self.bind_and_execute(statement)

        data_prime = [d + [i] for d in data for i in random.sample(range(0,100),end)]
        
        response = FutureHelpers.future_queue(data_prime,execute,callback,300,*args)
        return response


    def run_range(self,data,start,end,callback,*args,**kwargs):
        statement = kwargs.get("statement", None) or self.default_statement
        execute = self.bind_and_execute(statement)

        data_prime = [d + [i] for d in data for i in range(start,end)]
        
        response = FutureHelpers.future_queue(data_prime,execute,callback,300,*args)
        return response
    
    def run_sample(self,data,callback,is_sufficient,*args,**kwargs):
        for sample in self.SAMPLE_SIZES:
            logging.info("running %s" % sample[1])
            response = self.run_range(data,sample[0],sample[1],callback,*args,**kwargs)
            if is_sufficient(response): break
        return (response, sample[1])



class PreparedCassandraRangeQuery(CassandraRangeQuery):

    def __init__(self,cassandra,query,fields,range_field,**kwargs):
        self.query = query
        self.fields = fields
        self.range_field = range_field

    def __where_formatter__(self,fields):
        where = " WHERE "
        where += " and ".join(["%s = ?" % f for f in fields])
        return where

    def __set_formatter__(self,field):
        return " set %s = %s + ? " % (field,field)
    
    def __where__(self):
        where = " WHERE "
        where += " and ".join(["%s = ?" % f for f in self.fields])
        where += " and %s = ?" % self.range_field
        return where
    
    @property
    def default_statement(self):
        if not hasattr(self,"__statement__"):
            self.__statement__ = self.cassandra.prepare(self.query + self.__where__())
        return self.__statement__
 
