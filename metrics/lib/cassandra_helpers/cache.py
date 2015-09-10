from lib.cassandra_helpers.range_query import CassandraRangeQuery, PreparedCassandraRangeQuery
from lib.cassandra_helpers.helpers import FutureHelpers

FUTURES    = 60
NUM_DAYS   = 20
INSERT_UDF = "insert into full_replication.function_patterns (function,pattern) VALUES ('state_group_and_count','%s')"
INSERT = "INSERT INTO rockerbox.action_occurrence_u1 (source,date,action,uid,u1,url,occurrence) VALUES (?,?,?,?,?,?,?)"

def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates



def select_callback(result,*args):
    advertiser, pattern, inserts = args
    
    result = result[0]
    res = result['rockerbox.group_and_count(url, uid)']
    print result['date'], len(res)
    
    date = result["date"]
    for url_uid in res:
        if "[:]" in url_uid:
            url, uid = url_uid.split("[:]")
            inserts += [[advertiser,date,pattern,uid,int(uid[-2:]),url,int(res[url_uid])]]


class CassandraCache(PreparedCassandraRangeQuery):

    def __init__(self,cassandra,query,fields,range_field,insert_query):
        self.cassandra = cassandra
        self.query = query
        self.fields = fields
        self.range_field = range_field
        self.insert_query = insert_query

    def build_udf(self,pattern):
        print "build udf"
        self.cassandra.execute(INSERT_UDF % pattern)

   
    def build_cache(self,advertiser,pattern,callback,*args):
        _, _, inserts = self.run_select(advertiser,pattern,callback,*args)
        self.run_inserts(inserts)

    def execute(self,data):
        bound = self.default_statement.bind(data)
        return self.cassandra.execute_async(bound)

    def run_select(self,advertiser,pattern,callback,*args):

        self.build_udf(pattern)

        dates = build_datelist(NUM_DAYS)
        data = self.build_bound_data([advertiser],dates,0,100)

        return FutureHelpers.future_queue(data,self.execute,callback,FUTURES,*args)
        

    def run_inserts(self,inserts):
        import random 
        print "starting insert"
        if len(inserts) > 0:
            insert_statement = self.build_statement(INSERT,"","")
            bound_insert = self.bind_and_execute(insert_statement)
            def cb(x):
                print x
            random.shuffle(inserts)
            FutureHelpers.future_queue(inserts,bound_insert,cb,FUTURES)

def main(advertiser,pattern):
    
    from link import lnk
    c = lnk.dbs.cassandra
    SELECT = "SELECT date, group_and_count(url,uid) FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered"
    FIELDS = ["source","date"]
    INSERT = "INSERT INTO rockerbox.action_occurrence_u1 (source,date,action,uid,u1,url,occurrence) VALUES (?,?,?,?,?,?,?)"

    cache = CassandraCache(c,SELECT,FIELDS,"u2",INSERT)
    cache.build_cache(advertiser,pattern,select_callback,advertiser,pattern,[])


if __name__ == "__main__":
    import sys
    print sys.argv
    advertiser, pattern = sys.argv[1:]

    main(advertiser, pattern)
