from lib.cassandra_helpers.range_query import CassandraRangeQuery, PreparedCassandraRangeQuery
from lib.cassandra_helpers.helpers import FutureHelpers
import logging

FUTURES    = 60
NUM_DAYS   = 2
INSERT_UDF = "insert into full_replication.function_patterns (function,pattern) VALUES ('state_group_and_count','%s')"


def build_datelist(numdays,offset=0):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(offset, numdays+offset)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates

def simple_append(result,results,*args):
    results += result

def select_callback(result,*args):
    advertiser, pattern, i1, i2, i3 = args
    
    result = result[0]
    res = result['rockerbox.group_and_count(url, uid)']
    
    
    date = result["date"]
    for url_uid in res:
        if "[:]" in url_uid:
            url, uid = url_uid.split("[:]")
            i1 += [[advertiser,date,pattern,uid,int(uid[-2:]),url,int(res[url_uid])]]
            i2 += [[advertiser,date,pattern,uid,int(uid[-2:])]]
            i3 += [[advertiser,date,pattern,url]]
            if (len(i1) % 1000) == 0: logging.info("Cache query results: %s" % len(i1))



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

    def build_udf(self,pattern):
        self.cassandra.execute(INSERT_UDF % pattern)
   
    def build_cache(self,advertiser,pattern,callback,*args):
        _, _, inserts = self.run_select(advertiser,pattern,callback,*args)
        self.run_inserts(inserts)

    def execute(self,data):
        bound = self.default_statement.bind(data)
        return self.cassandra.execute_async(bound)

    def run_select(self,advertiser,pattern,callback,*args):

        self.build_udf(pattern)

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

        results = FutureHelpers.future_queue(to_pull,to_bind,simple_append,FUTURES,[])
        results = results[0]
        return results

    def run_counter_updates(self,url_inserts,select,update,dimensions=[],to_count="",count_column=""):
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

        cols = dimensions + [to_count]
        cols_with_count = cols + [count_column]

        select = select + self.__where_formatter__(dimensions)
        update = update + self.__set_formatter__(count_column) + self.__where_formatter__(cols)
        
    
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
        to_bind = self.bind_and_execute(statement)
        FutureHelpers.future_queue(to_update,to_bind,simple_append,FUTURES,[]) 

    def run_uids_to_domains(self,uid_inserts,select,insert):
        import pandas

        select = select
        statement = self.cassandra.prepare(select)
        to_bind = self.bind_and_execute(statement)

        # get all the data associated with the unique uids
        uids = [[j] for j in list(set([i[-2] for i in uid_inserts]))]
        results = FutureHelpers.future_queue(uids,to_bind,simple_append,60,[])
        results = results[0]

        df = pandas.DataFrame(results)

        print df.groupby("uid").count()['domain'].describe()

        domain_date = df.groupby(["domain","date"])["uid"].count()
        domain_date.name = "count"
        df = domain_date.reset_index()

        df["source"] = uid_inserts[0][0]
        df["action"] = uid_inserts[0][2]
       

        # i think this should probably be a count / user count table instead of a true insert
        insert = insert
        statement = self.cassandra.prepare(insert)
        to_bind = self.bind_and_execute(statement)

        inserts = df[['source','date','action','domain']].values.tolist()
        results = FutureHelpers.future_queue(inserts,to_bind,simple_append,60,[])
        
        
        

        
        

def compare_and_increment(new,old):
    """
    from a dataframe with new values 
    and a dataframe with old values
    produces the increments df to make the old look like the new
    """

    assert(list(old.columns) == list(new.columns))

    cols = list(old.columns)
    incrementor = cols[-1]
    indices = cols[:-1]

    _old = old.set_index(indices)
    _new = new.set_index(indices)

    joined = _new.join(_old,rsuffix="_old",how="outer")

    increments = joined[incrementor] - joined[incrementor + "_old"]
    increments = increments[increments > 0].map(int)
    increments.name = "count"

    return increments.reset_index()[["count"]+indices]

    
def group_all_and_count(df,name="count"):
    counted = df.groupby(list(df.columns))["url"].count()
    counted.name = name
    return counted.reset_index()
    

def run(advertiser,pattern,days,offset):

    logging.info("Cacheing: %s, %s begin" % (advertiser,pattern))

    from link import lnk
    import pandas

    c = lnk.dbs.cassandra
    SELECT = "SELECT date, group_and_count(url,uid) FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered"
    FIELDS = ["source","date"]

    cache = CassandraCache(c,SELECT,FIELDS,"u2","",days,offset)
    _, _, cache_insert, uid_values, url_values = cache.run_select(advertiser,pattern,select_callback,advertiser,pattern,[],[],[])

    logging.info("Cacheing: %s, %s occurance domains" % (advertiser,pattern))
    
    DOMAIN_SELECT = "select * from rockerbox.visitor_domains where uid = ?"
    DOMAIN_INSERT = "INSERT INTO rockerbox.action_occurrence_domains (source,date,action,domain) VALUES (?,?,?,?)"
    cache.run_uids_to_domains(uid_values,DOMAIN_SELECT,DOMAIN_INSERT)

    
    # UPDATE ACTION TO RAW DATA
    logging.info("Cacheing: %s, %s occurences raw" % (advertiser,pattern))

    CACHE_INSERT   = "INSERT INTO rockerbox.action_occurrence_u1 (source,date,action,uid,u1,url,occurrence) VALUES (?,?,?,?,?,?,?)"
    cache.run_inserts(cache_insert,CACHE_INSERT)


    # UPDATE ACTION TO UID TABLE
    logging.info("Cacheing: %s, %s occurence uuids" % (advertiser,pattern))

    UID_INSERT     = "INSERT INTO rockerbox.action_occurrence_users_u2 (source,date,action,uid,u2) VALUES (?,?,?,?,?)"
    cache.run_inserts(uid_values,UID_INSERT)


    # UPDATE URL COUNTER TABLE
    logging.info("Cacheing: %s, %s occurence urls" % (advertiser,pattern))

    SELECT_COUNTER = "SELECT * from rockerbox.action_occurrence_urls_counter" 
    UPDATE_COUNTER = "UPDATE rockerbox.action_occurrence_urls_counter" 

    dimensions     = ["source","date","action"]
    to_count       = "url"
    count_column   = "count"

    cache.run_counter_updates(url_values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column)
    
    logging.info("Cacheing: %s, %s end" % (advertiser,pattern))



if __name__ == "__main__":
    import sys
    print sys.argv
    advertiser, pattern, days, offset = sys.argv[1:]
    import time
    start = time.time()
    run(advertiser, pattern, int(days), int(offset))
    print time.time() - start
