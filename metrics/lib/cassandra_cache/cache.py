from lib.cassandra_helpers.range_query import CassandraRangeQuery, PreparedCassandraRangeQuery
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *
import logging

FUTURES    = 120
NUM_DAYS   = 2
INSERT_UDF = "insert into full_replication.function_patterns (function,pattern) VALUES ('%s','%s')"

class CassandraCache(PreparedCassandraRangeQuery):

    def __init__(self,cassandra,query,fields,range_field,insert_query,num_days=NUM_DAYS,num_offset=0,num_futures=FUTURES):
        self.cassandra = cassandra
        self.query = query
        self.fields = fields
        self.range_field = range_field
        self.insert_query = insert_query
        self.num_days = num_days
        self.num_offset = num_offset
        self.num_futures = num_futures

    def build_udf(self,udf_name,pattern):
        self.cassandra.execute(INSERT_UDF % (udf_name,pattern))
   
    def execute(self,data):
        bound = self.default_statement.bind(data)
        return self.cassandra.execute_async(bound)

    def run_select(self,advertiser,pattern,callback,*args):

        #self.build_udf(pattern)

        dates = build_datelist(self.num_days,self.num_offset)
        data = self.build_bound_data([advertiser],dates,0,100)

        return FutureHelpers.future_queue(data,self.execute,callback,self.num_futures,*args)


    def run_inserts(self,inserts,insert_query=None):
        insert_query = insert_query or self.insert_query
        import random 
        if len(inserts) > 0:
            insert_statement = self.build_statement(insert_query,"","")
            bound_insert = self.bind_and_execute(insert_statement)
            def cb(x):
                print x
            random.shuffle(inserts)
            FutureHelpers.future_queue(inserts,bound_insert,cb,self.num_futures)

    def pull_simple(self,to_pull,query):
        statement = self.cassandra.prepare(query)
        to_bind = self.bind_and_execute(statement)

        results = FutureHelpers.future_queue(to_pull,to_bind,simple_append,self.num_futures,[])
        results = results[0]
        return results

    def run_counter_updates(self,url_inserts,select,update,dimensions=[],to_count="",count_column="",counter_value=False):
        """
        Arguments:
          url_inserts: data to update
          select: select statement to use to check data
          update: update statement to use to insert data
          dimensions: dimensions that are fixed (and that we will use in the select)
          to_count: the field that we want to count (like url)
          count_column: the name of the database counter that we will update / increment
        """

        import pandas

        cols = dimensions
        if to_count not in dimensions:
            cols += [to_count]
        cols_with_count = cols + [count_column]

        select = select + self.__where_formatter__(dimensions)
        update = update + self.__set_formatter__(count_column) + self.__where_formatter__(cols)
        
        # if the count is part of the dataset, no need to group and count
        if counter_value:
       
            new_values = pandas.DataFrame(url_inserts,columns=cols_with_count)
        else:
            df = pandas.DataFrame(url_inserts,columns=cols)
            new_values = group_all_and_count(df,count_column)
        
    
        to_pull = new_values[dimensions].drop_duplicates().values.tolist()
        results = self.pull_simple(to_pull,select)
        
        # determine what needs to be update and by how much
        if len(results) > 0:
            existing_values = pandas.DataFrame(results,columns=cols_with_count)
            updates_df = compare_and_increment(new_values,existing_values)
            to_update = updates_df.values.tolist()
        else:
            to_update = new_values[[count_column]+list(new_values.columns)[:-1]].values.tolist()

            
        print "updating: %s" % len(to_update)
        statement = self.cassandra.prepare(update)
        print update

        to_bind = self.bind_and_execute(statement)
        FutureHelpers.future_queue(to_update,to_bind,simple_append,self.num_futures,[]) 

    def get_domains_from_uids(self,uid_inserts,select):
        import pandas

        statement = self.cassandra.prepare(select)
        to_bind = self.bind_and_execute(statement)
        uids = [[j] for j in list(set([i[-2] for i in uid_inserts]))]

        logging.info("Unique user ids :%s" % len(uids))
        results = FutureHelpers.future_queue(uids,to_bind,simple_append,self.num_futures,[])
        results = results[0]

        df = pandas.DataFrame(results)

        _temp = df.groupby("uid").count()
        bad_users = _temp[_temp.sort_index(by="domain").domain > 2000].index.tolist()
        
        print df.groupby("uid").count()['domain'].describe()
        import math
        counts, bins = pandas.np.histogram(df.groupby("uid").count()['domain'].map(lambda x: math.log(x,10)))
        print pandas.Series(counts, index=map(lambda x: 10**x,bins[:-1]))

        df = df[~df.uid.isin(bad_users)]

        print "Users with more than 2000 datapoints: %s" % len(bad_users)
        print df.groupby("uid").count()['domain'].describe()
        df['date'] = df.timestamp.map(lambda x: x.split(" ")[0] + " 00:00:00")


        #domain_date = df.groupby(["domain","date"])["uid"].count()
        domain_date = df.groupby(["domain","date"]).agg({"uid":lambda x: len(set(x))})['uid']

        domain_date.name = "count"
        df = domain_date.reset_index()

        df["source"] = uid_inserts[0][0]
        df["action"] = uid_inserts[0][2]

       
        return df
       
        


 

    def run_uids_to_domains(self,uid_inserts,select,insert):
        import pandas

        select = select
        statement = self.cassandra.prepare(select)
        to_bind = self.bind_and_execute(statement)

        # get all the data associated with the unique uids
        uids = [[j] for j in list(set([i[-2] for i in uid_inserts]))]

        logging.info("Unique user ids :%s" % len(uids))
        results = FutureHelpers.future_queue(uids,to_bind,simple_append,self.num_futures,[])
        results = results[0]

        df = pandas.DataFrame(results)

        print df.groupby("uid").count()['domain'].describe()
        df['date'] = df.timestamp.map(lambda x: x.split(" ")[0] + "00:00:00")


        domain_date = df.groupby(["domain","date"])["uid"].agg({"uid": lambda x: len(set(x))})
        domain_date.name = "count"
        df = domain_date.reset_index()

        df["source"] = uid_inserts[0][0]
        df["action"] = uid_inserts[0][2]
       

        # i think this should probably be a count / user count table instead of a true insert
        insert = insert
        statement = self.cassandra.prepare(insert)
        to_bind = self.bind_and_execute(statement)

        inserts = df[['source','date','action','domain']].values.tolist()
        results = FutureHelpers.future_queue(inserts,to_bind,simple_append,self.num_futures,[])
        
        



