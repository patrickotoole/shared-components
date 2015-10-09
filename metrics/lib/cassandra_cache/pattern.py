import logging
import time
from cache import CassandraCache
from pattern_cache import PatternCache
from helpers import *
from lib.helpers import *
from lib.zookeeper.zk_pool import ZKPool
from kazoo.client import KazooClient
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

def build_cache(days,offset,udf_name):
    from link import lnk
    import pandas


    c = lnk.dbs.cassandra
    SELECT = "SELECT date, %s FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered" % udf_name
    FIELDS = ["source","date"]

    cache = CassandraCache(c,SELECT,FIELDS,"u2","",days,offset) 
    return cache
    
def select(cache,udf_name,*args):
    logging.info("Cacheing: selecting %s => %s" % (args[0],args[1]))

    cache.build_udf(udf_name,args[1])
    logging.info("Cache using UDF: %s" % udf_name)
    _, _, cache_insert, uid_values, url_values = cache.run_select(*args)

    return (cache_insert, uid_values, url_values)

def run_daily(db):
    import pickle
    import work_queue

    df = db.select_dataframe("select distinct url_pattern, pixel_source_name from pattern_cache") 
    zk = KazooClient(hosts="zk1:2181")

    for i,row in df.iterrows():
        args = [row.pixel_source_name,row.url_pattern,1,1,True]
        work = (run,args)

        work_queue.SingleQueue(zk,"python_queue").put(pickle.dumps(work),21)

def update_tree(db,api):
    from lib.funnel import actions_to_delorean

    df = db.select_dataframe("select distinct url_pattern, pixel_source_name from pattern_cache")
    advertiser_nodes = []

    USER = "INSERT INTO rockerbox.pattern_occurrence_users_u2 (source, date, action, uid, u2) VALUES ('${source}', '${date}', '%(url_pattern)s', '${adnxs_uid}', ${u2});"
    RAW = "UPDATE rockerbox.pattern_occurrence_u2_counter set occurrence= occurrence + 1 where source = '${source}' and date = '${date}' and  url = '${referrer}' and uid = '${adnxs_uid}' and u2 = ${u2} and action = '%(url_pattern)s';"
    URL = "UPDATE rockerbox.pattern_occurrence_urls_counter set count= count + 1 where source = '${source}' and date = '${date}' and  url = '${referrer}' and action = '%(url_pattern)s';"
    VIEW = "UPDATE rockerbox.pattern_occurrence_views_counter set count= count + 1 where source = '${source}' and date = '${date}' and action = '%(url_pattern)s';"


    for advertiser in df.pixel_source_name.unique():
        nodes = []
        actions = Convert.df_to_values(df[df.pixel_source_name == advertiser])
        for action in actions:
            node = actions_to_delorean.create_action_node(action,RAW % action)
            nodes.append(node)
            node = actions_to_delorean.create_action_node(action,USER % action)
            nodes.append(node)
            node = actions_to_delorean.create_action_node(action,URL % action)
            nodes.append(node)
            node = actions_to_delorean.create_action_node(action,VIEW % action)
            nodes.append(node)


        advertiser_node = actions_to_delorean.create_node('"source": "%s' % advertiser, children=nodes)
        advertiser_nodes.append(advertiser_node)

    edits = actions_to_delorean.create_edits(advertiser_nodes)
    actions_to_delorean.push_edits(api,edits, label="_patterns", filter_type="visits")

    
def run_cascade(zk,advertiser,pattern,days,offset,callback):

    import metrics.work_queue as work_queue

    base = [advertiser,pattern]
    to_run = base + [1,offset,callback] if offset != days else False

    path = "/active_pattern_cache/" + advertiser + "=" + pattern.replace("/","|")
    path_plus = path + "/days=" + str(days) + ",offset=" + str(offset)


    complete_path = "/complete" + path[:7]
    complete_path_plus = "/complete" + path_plus[7:]
    

    if to_run is not False: 
        zk.create(path_plus)
        run(*to_run)
        zk.delete(path_plus,recursive=True)
        zk.create(complete_path_plus)
    
        if len(zk.get_children(complete_path)) == days:
            zk.delete(path,recursive=True)


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

    db.execute("INSERT INTO pattern_cache (url_pattern,pixel_source_name,num_days,cache_date) VALUES ('%s','%s',%s,'%s')" % (pattern,advertiser,days+offset,cache_date))

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
    run(advertiser, pattern, int(days), int(offset), bool(force))

    print time.time() - start
