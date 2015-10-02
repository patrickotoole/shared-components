import logging
import time
from cache import CassandraCache
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

        
def run(advertiser,pattern,days,offset,force=False):

    from link import lnk
    db = lnk.dbs.rockerbox
    api = lnk.api.rockerbox

    start = time.time()

    days_offset = days + offset

    SKIP = "SELECT * FROM pattern_cache where pixel_source_name = '%s' and url_pattern = '%s' and num_days = %s" 

    skip = db.select_dataframe(SKIP % (advertiser,pattern,days+offset))
    if force is not True and len(skip) > 0:
        return 

    db.execute("INSERT INTO pattern_cache (url_pattern,pixel_source_name,num_days) VALUES ('%s','%s',%s)" % (pattern,advertiser,days+offset))

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


    # ACTION => VIEWS COUNTER CACHE
    logging.info("Cacheing: %s => %s views" % (advertiser,pattern))

    SELECT_COUNTER = "SELECT * from rockerbox.pattern_occurrence_views_counter"
    UPDATE_COUNTER = "UPDATE rockerbox.pattern_occurrence_views_counter"

    dimensions     = ["source","date","action"]
    to_count       = "action"
    count_column   = "count"
    
    all_columns = dimensions + ["uid","u2","url","count"]

    if len(cache_insert):
        series = pandas.DataFrame(cache_insert,columns=all_columns).groupby(dimensions)['count'].sum()

        values = series.reset_index().values.tolist()
        cache.run_counter_updates(values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column,True)



    # ACTION => VISITS
    logging.info("Cacheing: %s => %s occurence uniques" % (advertiser,pattern))

    UID_INSERT     = "INSERT INTO rockerbox.pattern_occurrence_visits (source,date,action,count) VALUES (?,?,?,?)"
    if len(cache_insert):
        
        series = pandas.DataFrame(cache_insert,columns=all_columns).groupby(dimensions + ["uid","url"])['count'].count()
        reset = series.reset_index()

        dims = reset.groupby(dimensions)['count'].count()
        values = dims.reset_index().values.tolist()

        cache.run_inserts(values,UID_INSERT)



    # ACTION => UNIQUES
    logging.info("Cacheing: %s => %s occurence uniques" % (advertiser,pattern))

    UID_INSERT     = "INSERT INTO rockerbox.pattern_occurrence_uniques (source,date,action,count) VALUES (?,?,?,?)"
    if len(uid_values):

        series = pandas.DataFrame(cache_insert,columns=all_columns).groupby(dimensions + ["uid"])['count'].count()
        reset = series.reset_index()

        dims = reset.groupby(dimensions)['count'].count()
        values = dims.reset_index().values.tolist()
       
        cache.run_inserts(values,UID_INSERT)





    # ACTION => RAW DATA CACHE
    logging.info("Cacheing: %s => %s occurences raw" % (advertiser,pattern))


    SELECT_COUNTER = "SELECT * from rockerbox.pattern_occurrence_u2_counter"
    UPDATE_COUNTER = "UPDATE rockerbox.pattern_occurrence_u2_counter"

    dimensions     = ["source","date","action","uid","u2"]
    to_count       = "url"
    count_column   = "occurrence"

    if len(cache_insert):
        cache.run_counter_updates(cache_insert,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column,True)
    

    # ACTION => UIDS
    logging.info("Cacheing: %s => %s occurence uuids" % (advertiser,pattern))

    UID_INSERT     = "INSERT INTO rockerbox.pattern_occurrence_users_u2 (source,date,action,uid,u2) VALUES (?,?,?,?,?)"
    if len(uid_values):
        cache.run_inserts(uid_values,UID_INSERT)


    # ACTION => PAGE_URLS
    logging.info("Cacheing: %s => %s occurence urls" % (advertiser,pattern))

    SELECT_COUNTER = "SELECT * from rockerbox.pattern_occurrence_urls_counter" 
    UPDATE_COUNTER = "UPDATE rockerbox.pattern_occurrence_urls_counter" 

    dimensions     = ["source","date","action"]
    to_count       = "url"
    count_column   = "count"

    if len(url_values):
        cache.run_counter_updates(url_values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column)


    # ACTION => DOMAINS
    logging.info("Cacheing: %s => %s occurance domains" % (advertiser,pattern))
    
    DOMAIN_SELECT = "select * from rockerbox.visitor_domains_2 where uid = ?"
    DOMAIN_INSERT = "INSERT INTO rockerbox.pattern_occurrence_domains (source,date,action,domain) VALUES (?,?,?,?)"

    SELECT_COUNTER = "SELECT * from rockerbox.pattern_occurrence_domains_counter"
    UPDATE_COUNTER = "UPDATE rockerbox.pattern_occurrence_domains_counter"
    dimensions     = ["source","date","action"]
    to_count       = "domain"
    count_column   = "count"

    

    if len(uid_values):
        domain_values = cache.get_domains_from_uids(uid_values,DOMAIN_SELECT)
        domain_values = domain_values[["source","date","action","domain","count"]].values.tolist()
        cache.run_counter_updates(domain_values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column,True)
    


    logging.info("Cacheing: %s => %s end" % (advertiser,pattern))

    elapsed = int(time.time() - start)

    db.execute("UPDATE pattern_cache set completed = 1, seconds = %s where pixel_source_name = '%s' and url_pattern = '%s' and num_days = %s " % (elapsed,advertiser,pattern,days_offset))

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
