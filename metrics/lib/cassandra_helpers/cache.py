from lib.cassandra_helpers.range_query import CassandraRangeQuery, PreparedCassandraRangeQuery
from lib.cassandra_helpers.helpers import FutureHelpers

FUTURES    = 60
NUM_DAYS   = 1
INSERT = "INSERT INTO rockerbox.action_occurrence_u1 (source,date,action,uid,u1,url,occurrence) VALUES (?,?,?,?,?,?,?)"
INSERT_UDF = "insert into full_replication.function_patterns (function,pattern) VALUES ('state_group_and_count','%s')"


def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates

def simple_append(result,results,*args):
    results += result

def select_callback(result,*args):
    advertiser, pattern, i1, i2, i3 = args
    
    result = result[0]
    res = result['rockerbox.group_and_count(url, uid)']
    print result['date'], len(res)
    
    date = result["date"]
    for url_uid in res:
        if "[:]" in url_uid:
            url, uid = url_uid.split("[:]")
            i1 += [[advertiser,date,pattern,uid,int(uid[-2:]),url,int(res[url_uid])]]
            i2 += [[advertiser,date,pattern,uid,int(uid[-2:])]]
            i3 += [[advertiser,date,pattern,url]]



class CassandraCache(PreparedCassandraRangeQuery):

    def __init__(self,cassandra,query,fields,range_field,insert_query,num_days=NUM_DAYS,num_futures=FUTURES):
        self.cassandra = cassandra
        self.query = query
        self.fields = fields
        self.range_field = range_field
        self.insert_query = insert_query
        self.num_days = num_days
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

        dates = build_datelist(self.num_days)
        data = self.build_bound_data([advertiser],dates,0,100)

        return FutureHelpers.future_queue(data,self.execute,callback,self.num_futures,*args)


    def run_inserts(self,inserts,insert_query=None):
        insert_query = insert_query or self.insert_query
        import random 
        print "starting insert"
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

        
        

def main(advertiser,pattern):
    # DEPRECATED 
    from link import lnk
    c = lnk.dbs.cassandra
    SELECT = "SELECT date, group_and_count(url,uid) FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered"
    FIELDS = ["source","date"]
    INSERT = "INSERT INTO rockerbox.action_occurrence_u1 (source,date,action,uid,u1,url,occurrence) VALUES (?,?,?,?,?,?,?)"

    cache = CassandraCache(c,SELECT,FIELDS,"u2",INSERT)
    cache.build_cache(advertiser,pattern,select_callback,advertiser,pattern,[])

def compare_and_increment(new,old):
    """
    from a dataframe with new values 
    and a dataframe with old values
    produces the increments to make the old look like the new
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
    

def run(advertiser,pattern):
    from link import lnk
    import pandas

    c = lnk.dbs.cassandra
    SELECT = "SELECT date, group_and_count(url,uid) FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered"
    FIELDS = ["source","date"]

    cache = CassandraCache(c,SELECT,FIELDS,"u2","")
    _, _, cache_insert, uid_values, url_values = cache.run_select(advertiser,pattern,select_callback,advertiser,pattern,[],[],[])


    # UPDATE ACTION TO RAW DATA
    CACHE_INSERT   = "INSERT INTO rockerbox.action_occurrence_u1 (source,date,action,uid,u1,url,occurrence) VALUES (?,?,?,?,?,?,?)"
    cache.run_inserts(cache_insert,CACHE_INSERT)


    # UPDATE ACTION TO UID TABLE
    UID_INSERT     = "INSERT INTO rockerbox.action_occurrence_users_u2 (source,date,action,uid,u2) VALUES (?,?,?,?,?)"
    cache.run_inserts(uid_values,UID_INSERT)


    # UPDATE URL COUNTER TABLE
    SELECT_COUNTER = "SELECT * from rockerbox.action_occurrence_urls_counter" 
    UPDATE_COUNTER = "UPDATE rockerbox.action_occurrence_urls_counter" 

    dimensions     = ["source","date","action"]
    to_count       = "url"
    count_column   = "count"

    cache.run_counter_updates(url_values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column)
    
        



if __name__ == "__main__":
    import sys
    print sys.argv
    advertiser, pattern = sys.argv[1:]

    run(advertiser, pattern)
