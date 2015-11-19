import time 
import logging
import zk_helpers

from pattern_cache import PatternCache
from pattern_helpers import *
from helpers import simple_append

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

def get_raw(cassandra,advertiser,pattern,cache_date):
    from lib.cassandra_helpers.statement import CassandraFutureStatement

    query = """select * from rockerbox.pattern_occurrence_u2_counter """
    where = """where source = ? and date = ? and action = ? and u2 = ?"""
    data = [[advertiser,str(cache_date).split(" ")[0] + " 00:00:00",pattern,i] for i in range(0,100)]

    prepared_future = CassandraFutureStatement(cassandra,query + where)
    results = prepared_future.run(data)

    formatted = [[advertiser,i['date'],pattern,i['uid'],int(i['uid'][-2:]),i['url'],i['occurrence']] for i in results]

    return formatted 
 


def run_backfill(advertiser,pattern,cache_date,force=False,identifier="test",connectors=False):
    import time 
    connectors = connectors or get_connectors()

    db = connectors['db']
    zk = connectors['zk']

    start = time.time()

    cache = zk_helpers.ZKCacheHelpers(zk,advertiser,pattern,identifier)
    days_offset = days + offset

    with cache:

        now, cache_date = build_times(days_offset)

        # log start
        insert_pattern_log(db,pattern,advertiser,cache_date)
        logging.info("Cacheing: %s => %s begin" % (advertiser,pattern))

        # run cache
        cache = build_cache(days,offset,"")

        # schema: [advertiser, date, pattern, uid, u2, url, count]
        cache_insert = get_raw(cache,cache_date,advertiser,pattern)

        pattern_cache = PatternCache(cache,advertiser,pattern,cache_insert,[],[])
        pattern_cache.cache_views()
        pattern_cache.cache_uniques()
        pattern_cache.cache_visits()

        #pattern_cache.cache_domains()
        
        # log end
        elapsed = int(time.time() - start)
        update_pattern_log(db,pattern,advertiser,cache_date,elapsed)
        logging.info("Cacheing: %s => %s end" % (advertiser,pattern))
        
        cache.cassandra.cluster.shutdown()

def run_recurring(zk,advertiser,pattern,days,offset,force=False,identifier="test"):
    import time 
    from link import lnk
    db = lnk.dbs.rockerbox
    api = lnk.api.rockerbox

    start = time.time()

    cache = zk_helpers.ZKCacheHelpers(zk,advertiser,pattern,identifier)
    days_offset = days + offset

    with cache:

        now, cache_date = build_times(days_offset)

        # log start
        insert_pattern_log(db,pattern,advertiser,cache_date)
        logging.info("Cacheing: %s => %s begin" % (advertiser,pattern))

        # run cache
        cache = build_cache(days,offset,"")

        # schema: [advertiser, date, pattern, uid, u2, url, count]
        cache_insert = get_raw(cache,cache_date,advertiser,pattern)

        pattern_cache = PatternCache(cache,advertiser,pattern,cache_insert,[],[])
        pattern_cache.cache_views()
        pattern_cache.cache_uniques()
        pattern_cache.cache_visits()

        #pattern_cache.cache_domains()
        
        # log end
        elapsed = int(time.time() - start)
        update_pattern_log(db,pattern,advertiser,cache_date,elapsed)
        logging.info("Cacheing: %s => %s end" % (advertiser,pattern))
        
        cache.cassandra.cluster.shutdown()


