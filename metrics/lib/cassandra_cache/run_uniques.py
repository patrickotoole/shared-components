import logging
import zk_helpers

from pattern_cache import PatternCache
from pattern_helpers import *
from helpers import simple_append

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()


INSERT = "INSERT INTO pattern_unique_cache (url_pattern,pixel_source_name,cache_date) VALUES ('%s','%s','%s')"
UPDATE = "UPDATE pattern_unique_cache set deleted = 1, seconds = 0 where pixel_source_name = '%s' and url_pattern = '%s' and cache_date >= '%s' and cache_date < '%s' "
UPDATE2 = "UPDATE pattern_unique_cache set deleted = 0, completed = 1, seconds = %s where pixel_source_name = '%s' and url_pattern = '%s' and cache_date = '%s'"

Q = "select uid from rockerbox.pattern_occurrence_u2_counter where source = ? and date = ? and action = ? and u2 = ?"


# HELPERS

def build_times(days_offset):
    import datetime 

    now = datetime.datetime.now()
    cache_date = now - datetime.timedelta(days=days_offset)

    return (now, cache_date)

def insert_pattern_log(db,pattern,advertiser,cache_date):
    db.execute(INSERT % (pattern,advertiser,cache_date))

def update_pattern_log(db,pattern,advertiser,cache_date,elapsed):
    import datetime
    cache_date_max = (cache_date + datetime.timedelta(days=1)).date()
    cache_date_min = cache_date.date()
        
    db.execute(UPDATE % (advertiser,pattern,cache_date_min,cache_date_max))
    db.execute(UPDATE2 % (elapsed,advertiser,pattern,cache_date.strftime("%Y-%m-%d %H:%M:%S")))



# DATA PULL

def get_uids(cache,cache_date,advertiser,pattern):
    from lib.cassandra_helpers.helpers import FutureHelpers

    statement = cache.cassandra.prepare(Q)
    to_bind = cache.bind_and_execute(statement)
    to_update = [[advertiser,str(cache_date).split(" ")[0] + " 00:00:00",pattern,i] for i in range(0,100)]

    uid_values, _ = FutureHelpers.future_queue(to_update,to_bind,simple_append,60,[],False) 
    formatted = [[advertiser,i['uid'],pattern] for i in uid_values]

    return formatted 
    

def run_uniques(zk,advertiser,pattern,days,offset,force=False,identifier="test"):
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

        uid_values = get_uids(cache,cache_date,advertiser,pattern)
        pattern_cache = PatternCache(cache,advertiser,pattern,[],uid_values,[])
        pattern_cache.cache_domains()
        
        # log end
        elapsed = int(time.time() - start)
        update_pattern_log(db,pattern,advertiser,cache_date,elapsed)
        logging.info("Cacheing: %s => %s end" % (advertiser,pattern))
        
        cache.cassandra.cluster.shutdown()


if __name__ == "__main__":
    import sys, time
    from kazoo.client import KazooClient
    start = time.time()
    zk = KazooClient(hosts="zk1:2181")
    zk.start()

    logging.info("Parameters: %s" % str(sys.argv))

    advertiser, pattern, days, offset, force = sys.argv[1:]
    run_domains(zk,advertiser, pattern, int(days), int(offset), bool(force))

    logging.info("Elapsed:  %s " % (time.time() - start))
