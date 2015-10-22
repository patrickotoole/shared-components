import logging
import datetime
import time
import zk_helpers

from pattern_cache import PatternCache
from pattern_helpers import *
from pattern_tree import *
from helpers import *
from lib.helpers import *
from lib.zookeeper.zk_pool import ZKPool
from kazoo.client import KazooClient
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()


    
def run_daily(db):
    import pickle
    import work_queue

    df = db.select_dataframe("select distinct url_pattern, pixel_source_name from pattern_cache") 
    zk = KazooClient(hosts="zk1:2181")

    for i,row in df.iterrows():
        args = [row.pixel_source_name,row.url_pattern,1,1,True]
        work = (run,args)

        work_queue.SingleQueue(zk,"python_queue").put(pickle.dumps(work),21)

    

def run_one(zk,advertiser,pattern,days,offset,force=False,identifier=""):
    cache = zk_helpers.ZKCacheHelpers(zk,advertiser,pattern,identifier)
    with cache:
        run(advertiser,pattern,days,offset,force)



        
def run(advertiser,pattern,days,offset,force=False):

    print advertiser,pattern,days,offset,force

    from link import lnk
    db = lnk.dbs.rockerbox
    api = lnk.api.rockerbox

    start = time.time()

    days_offset = days + offset

    SKIP = "SELECT * FROM pattern_cache where pixel_source_name = '%s' and url_pattern = '%s' and num_days = %s" 

    skip = db.select_dataframe(SKIP % (advertiser,pattern,days+offset))
    if force is not True and len(skip) > 0:
        return 


    import datetime 

    now = datetime.datetime.now()
    cache_date = now - datetime.timedelta(days=days+offset)

    INSERT = "INSERT INTO pattern_cache (url_pattern,pixel_source_name,num_days,cache_date) VALUES ('%s','%s',%s,'%s')"
    db.execute(INSERT % (pattern,advertiser,days+offset,cache_date))

    if offset == 0: 
        update_tree(db,api)

    logging.info("Cacheing: %s => %s begin" % (advertiser,pattern))

    zk_lock = ZKPool()
    with zk_lock.get_lock() as lock:

        udf_name = lock.get()
        state, udf = udf_name.split("|")
        udf = udf.replace(",",", ")

        cache = build_cache(days,offset,udf)
        select_args = [advertiser,pattern,wrapped_select_callback(udf),advertiser,pattern,[],[],[]]

        cache_insert, uid_values, url_values = select(cache,state,*select_args)

    pattern_cache = PatternCache(cache,advertiser,pattern,cache_insert,uid_values,url_values)

    pattern_cache.cache_views()
    pattern_cache.cache_visits()
    pattern_cache.cache_uniques()
    pattern_cache.cache_raw()

    pattern_cache.cache_uids()
    pattern_cache.cache_urls()
    pattern_cache.cache_domains()

    
    logging.info("Cacheing: %s => %s end" % (advertiser,pattern))

    elapsed = int(time.time() - start)

    

    cache_date_max = (cache_date + datetime.timedelta(days=1)).date()
    cache_date_min = cache_date.date()

    UPDATE = "UPDATE pattern_cache set deleted = 1, seconds = 0 where pixel_source_name = '%s' and url_pattern = '%s' and cache_date >= '%s' and cache_date < '%s' "
    UPDATE2 = "UPDATE pattern_cache set deleted = 0, completed = 1, seconds = %s where pixel_source_name = '%s' and url_pattern = '%s' and num_days = %s and cache_date = '%s'"
    
    db.execute(UPDATE % (advertiser,pattern,cache_date_min,cache_date_max))
    db.execute(UPDATE2 % (elapsed,advertiser,pattern,days_offset,cache_date.strftime("%Y-%m-%d %H:%M:%S")))


    zk_lock.stop()
    logging.info("Lock stopped")

    cache.cassandra.cluster.shutdown()

if __name__ == "__main__":
    import sys, time
    print sys.argv
    advertiser, pattern, days, offset, force = sys.argv[1:]
    start = time.time()
    zk = KazooClient(hosts="zk1:2181")
    zk.start()
    #run_domains(zk,advertiser, pattern, int(days), int(offset), bool(force))
    run_one(zk,advertiser, pattern, int(days), int(offset), bool(force),"test")

    print time.time() - start
