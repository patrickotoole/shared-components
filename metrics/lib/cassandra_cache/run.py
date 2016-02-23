import time 
import logging
import zk_helpers

from pattern_cache import PatternCache
from helpers import simple_append, wrapped_select_callback

from lib.zookeeper.zk_pool import ZKPool

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()



def get_connectors():

    from link import lnk
    return {
        "db": lnk.dbs.rockerbox,
        "zk": {},
        "cassandra": lnk.dbs.cassandra
    }

def get_backfill(cassandra,advertiser,pattern,cache_date, udf_name):
    from lib.cassandra_helpers.future_statement import CassandraFutureStatement

    query = """SELECT date, %s FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered """ % udf_name
    where = """WHERE source = ? and date = ? and u2 = ?"""
    data = [[advertiser,str(cache_date).split(" ")[0] + " 00:00:00",i] for i in range(0,100)]

    prepared_future = CassandraFutureStatement(cassandra,query + where)
    callback = wrapped_select_callback(udf_name)
    results = prepared_future.run(data,callback,advertiser,pattern,[],[],[])

    return results

def get_recurring(cassandra,advertiser,pattern,cache_date):
    from lib.cassandra_helpers.future_statement import CassandraFutureStatement

    query = """select * from rockerbox.pattern_occurrence_u2_counter """
    where = """where source = ? and date = ? and action = ? and u2 = ?"""
    data = [[advertiser,str(cache_date).split(" ")[0] + " 00:00:00",pattern,i] for i in range(0,100)]

    prepared_future = CassandraFutureStatement(cassandra,query + where)
    results = prepared_future.run(data,simple_append,[])
    results = results[0]

    formatted = [[advertiser,i['date'],pattern,i['uid'],int(i['uid'][-2:]),i['url'],i['occurrence']] for i in results]

    return formatted 
 


def run_backfill(advertiser,pattern,cache_date,identifier="test",connectors=False):
    """
    This should be run when an action is created so that we cache the data in the action.
    It will prevent us from using sampled data
    """

    import time 
    connectors = connectors or get_connectors()

    db = connectors['db']
    zk = connectors['zk']
    cassandra = connectors['cassandra']

    start = time.time()

    cache = zk_helpers.ZKCacheHelpers(zk,advertiser,pattern,identifier)

    zk_lock = ZKPool(zk=zk)
    with zk_lock.get_lock() as udf:
        udf_name = udf.get()
        state, udf = udf_name.split("|")
        udf = udf.replace(",",", ")

        
        INSERT_UDF = "insert into full_replication.function_patterns (function,pattern) VALUES ('%s','%s')"
        SELECT_UDF = "select * from full_replication.function_patterns where function = '%s' "
        cassandra.execute(INSERT_UDF % (state,pattern))
        cassandra.select_dataframe(SELECT_UDF % (state))

        with cache:
            
            INSERT_PATTERN_CACHE = "INSERT INTO rockerbox.pattern_cache (url_pattern,pixel_source_name,cache_date) VALUES ('%s','%s','%s')" 
            UPDATE_PATTERN_CACHE = "UPDATE rockerbox.pattern_cache SET completed=1, seconds=%s where url_pattern = '%s' and pixel_source_name = '%s' and cache_date = '%s'"

            db.execute(INSERT_PATTERN_CACHE % (pattern,advertiser,cache_date))
    
            _, _, raw_data, uid_values, url_values = get_backfill(cassandra,advertiser,pattern,cache_date,udf)

            logging.info("Raw data for %s %s: %s" % (advertiser,pattern,len(raw_data)))
            logging.info("UID data for %s %s: %s" % (advertiser,pattern,len(uid_values)))
            logging.info("URL data for %s %s: %s" % (advertiser,pattern,len(url_values)))

            pattern_cache = PatternCache(cassandra,advertiser,pattern,raw_data,uid_values,url_values)
    
            pattern_cache.cache_raw()
            pattern_cache.cache_uids()
            pattern_cache.cache_urls()
            pattern_cache.cache_views()
            pattern_cache.cache_uniques()
            pattern_cache.cache_visits()

            elapsed = int(time.time() - start)
            db.execute(UPDATE_PATTERN_CACHE % (elapsed,pattern,advertiser,cache_date))

           


def run_recurring(advertiser,pattern,cache_date,identifier="test",connectors=False):
    """
    This should be run once a day for the previous day. It will cache data for 
    views, visits, uniques and domains to make the UI load more quickly.
    """
    import time 
    connectors = connectors or get_connectors()

    db = connectors['db']
    zk = connectors['zk']
    cassandra = connectors['cassandra']

    start = time.time()

    cache = zk_helpers.ZKCacheHelpers(zk,advertiser,pattern,identifier)

    with cache:

        INSERT_PATTERN_CACHE = "INSERT INTO rockerbox.pattern_unique_cache (url_pattern,pixel_source_name,cache_date) VALUES ('%s','%s','%s')" 
        UPDATE_PATTERN_CACHE = "UPDATE rockerbox.pattern_unique_cache SET completed=1, seconds=%s where url_pattern = '%s' and pixel_source_name = '%s' and cache_date = '%s'"

        db.execute(INSERT_PATTERN_CACHE % (pattern,advertiser,cache_date))

        raw_data = get_recurring(cassandra,advertiser,pattern,cache_date)
        uid_values = [[i[3],False] for i in raw_data]

        pattern_cache = PatternCache(cassandra,advertiser,pattern,raw_data,uid_values,[])

        # cache recurring
        pattern_cache.cache_views()
        pattern_cache.cache_uniques()
        pattern_cache.cache_visits()

        #pattern_cache.cache_domains()
        #pattern_cache.cache_hll_domains(cache_date)

        elapsed = int(time.time() - start)

        db.execute(UPDATE_PATTERN_CACHE % (elapsed,pattern,advertiser,cache_date))



if __name__ == "__main__":
    import sys, time
    from kazoo.client import KazooClient
    from link import lnk
    start = time.time()
    zk = KazooClient(hosts="zk1:2181")
    zk.start()

    logging.info("Parameters: %s" % str(sys.argv))

    advertiser, pattern, cache_date, backfill = sys.argv[1:]
    connectors = {
        "zk": zk,
        "db": lnk.dbs.rockerbox,
        "cassandra": lnk.dbs.cassandra 
    }


    if backfill == "true":
        run_backfill(advertiser, pattern, cache_date, connectors=connectors)
    else:
        run_recurring(advertiser, pattern, cache_date, connectors=connectors)


    logging.info("Elapsed:  %s " % (time.time() - start))
