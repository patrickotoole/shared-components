import logging
import zk_helpers

from pattern_cache import PatternCache
from pattern_helpers import *
from helpers import simple_append

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()



# HELPERS

def build_times(days_offset):
    import datetime 

    now = datetime.datetime.now()
    cache_date = now - datetime.timedelta(days=days_offset)

    return (now, cache_date)


# DATA PULL

def clear(cache,query,cache_date,advertiser,pattern):
    from lib.cassandra_helpers.helpers import FutureHelpers

    statement = cache.cassandra.prepare(query)
    to_bind = cache.bind_and_execute(statement)
    to_update = [[advertiser,str(cache_date).split(" ")[0] + " 00:00:00",pattern]]

    uid_values, _ = FutureHelpers.future_queue(to_update,to_bind,simple_append,60,[],False) 

    return uid_values

def clear_u2(cache,query,cache_date,advertiser,pattern):
    from lib.cassandra_helpers.helpers import FutureHelpers

    statement = cache.cassandra.prepare(query)
    to_bind = cache.bind_and_execute(statement)
    to_update = [[advertiser,str(cache_date).split(" ")[0] + " 00:00:00",pattern,i] for i in range(0,100)]

    uid_values, _ = FutureHelpers.future_queue(to_update,to_bind,simple_append,60,[],False) 

    return uid_values

    

def run_clear(zk,advertiser,pattern,days,offset,force=False,identifier="test"):
    import time 
    from link import lnk
    db = lnk.dbs.rockerbox
    api = lnk.api.rockerbox

    start = time.time()

    cache = zk_helpers.ZKCacheHelpers(zk,advertiser,pattern,identifier)
    days_offset = days + offset

    with cache:

        now, cache_date = build_times(days_offset)

        logging.info("Clearing: %s %s %s" % (advertiser,pattern, cache_date))

        cache = build_cache(days,offset,"")
        Q1 = "DELETE from rockerbox.pattern_occurrence_domains_counter where source = ? and date = ? and action = ? "
        Q2 = "DELETE from rockerbox.pattern_occurrence_views_counter where source = ? and date = ? and action = ? "
        Q3 = "DELETE from rockerbox.pattern_occurrence_visits where source = ? and date = ? and action = ? "
        Q4 = "DELETE from rockerbox.pattern_occurrence_uniques where source = ? and date = ? and action = ? "
        Q5 = "DELETE from rockerbox.pattern_occurrence_domains_counter where source = ? and date = ? and action = ? "
        Q6 = "DELETE from rockerbox.pattern_occurrence_urls_counter where source = ? and date = ? and action = ? "

        uid_values = clear(cache,Q1,cache_date,advertiser,pattern)
        uid_values = clear(cache,Q2,cache_date,advertiser,pattern)
        uid_values = clear(cache,Q3,cache_date,advertiser,pattern)
        uid_values = clear(cache,Q4,cache_date,advertiser,pattern)
        uid_values = clear(cache,Q5,cache_date,advertiser,pattern)
        uid_values = clear(cache,Q6,cache_date,advertiser,pattern)

        Q1 = "DELETE from rockerbox.pattern_occurrence_u2_counter where source = ? and date = ? and action = ? and u2 = ? "
        Q2 = "DELETE from rockerbox.pattern_occurrence_users_u2 where source = ? and date = ? and action = ? and u2 = ? "

        uid_values = clear_u2(cache,Q1,cache_date,advertiser,pattern)
        uid_values = clear_u2(cache,Q2,cache_date,advertiser,pattern)

        UPDATE = "UPDATE pattern_cache set deleted = 1, seconds = 0 where pixel_source_name = '%s' and url_pattern = '%s' and cache_date >= '%s' and cache_date < '%s' "
    
        cache_date_max = (cache_date + datetime.timedelta(days=1)).date()
        cache_date_min = cache_date.date()
        db.execute(UPDATE % (advertiser,pattern,cache_date_min,cache_date_max))


        
        elapsed = int(time.time() - start)
        logging.info("Cleared: %s => %s" % (advertiser,pattern))
        
        cache.cassandra.cluster.shutdown()


if __name__ == "__main__":
    import sys, time
    from kazoo.client import KazooClient
    start = time.time()
    zk = KazooClient(hosts="zk1:2181")
    zk.start()

    logging.info("Parameters: %s" % str(sys.argv))

    advertiser, pattern, days, offset, force = sys.argv[1:]
    run_clear(zk,advertiser, pattern, int(days), int(offset), bool(force))

    logging.info("Elapsed:  %s " % (time.time() - start))
