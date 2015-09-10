from cassandra_range_query import CassandraRangeQuery, PreparedCassandraRangeQuery
from cassandra_helper import FutureHelpers

FUTURES    = 300
NUM_DAYS   = 20
INSERT_UDF = "insert into full_replication.function_patterns (function,pattern) VALUES ('state_group_and_count','%s')"

class CassandraCache(PreparedCassandraRangeQuery):

    def __init__(self,cassandra,query,fields,range_field,insert_query):
        self.cassandra = cassandra
        self.query = query
        self.fields = fields
        self.range_field = range_field
        self.insert_query = insert_query

    def build_udf(self,pattern):
        self.cassandra.execute(INSERT_UDF % pattern)

   
    def build_cache(self,advertiser,pattern,callback,*args):

        _, _, inserts = run_select(advertiser,pattern,callback,*args)
        self.build_inserts(inserts)

    def run_select(self,advertiser,pattern,callback,*args):

        self.build_udf(pattern)

        dates = build_datelist(NUM_DAYS)
        data = self.build_bound_data([advertiser],dates,0,100)

        return FutureHelpers.future_queue(data,self.execute,callback,FUTURES,*args)
        

    def run_inserts(self,inserts):
        import random 

        if len(inserts) > 0:
            insert_statement = self.build_statement(INSERT,"","")
            bound_insert = self.bind_and_execute(insert_statement)
            def cb(x):
                print x
            random.shuffle(inserts)
            FutureHelpers.future_queue(inserts,bound_insert,cb,FUTURES)
