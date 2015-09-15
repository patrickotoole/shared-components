import logging
from cache import CassandraCache
from helpers import *
from lib.helpers import *
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

def build_cache(days,offset):
    from link import lnk
    import pandas

    c = lnk.dbs.cassandra
    SELECT = "SELECT date, group_and_count(url,uid) FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered"
    FIELDS = ["source","date"]

    cache = CassandraCache(c,SELECT,FIELDS,"u2","",days,offset) 
    return cache
    
def select(cache,*args):
    logging.info("Cacheing: selecting %s => %s" % (args[0],args[1]))
    _, _, cache_insert, uid_values, url_values = cache.run_select(*args)

    return (cache_insert, uid_values, url_values)

def update_tree(db,api):
    from lib.funnel import actions_to_delorean

    df = db.select_dataframe("select * from pattern_cache")
    advertiser_nodes = []

    USER = "INSERT INTO rockerbox.pattern_occurrence_users_u2 (source, date, action, uid, u2) VALUES ('${source}', '${date}', '%(url_pattern)s', '${adnxs_uid}', ${u2});"
    RAW = "UPDATE rockerbox.pattern_occurrence_u2_counter set occurrence= occurrence + 1 where source = '${source}' and date = '${date}' and  url = '${referrer}' and uid = '${adnxs_uid}' and u2 = ${u2} and action = '%(url_pattern)s';"
    DOMAIN = "UPDATE rockerbox.pattern_occurrence_urls_counter set count= count + 1 where source = '${source}' and date = '${date}' and  url = '${referrer}' and action = '%(url_pattern)s';"

    for advertiser in df.pixel_source_name.unique():
        nodes = []
        actions = Convert.df_to_values(df[df.pixel_source_name == advertiser])
        for action in actions:
            node = actions_to_delorean.create_action_node(action,RAW % action)
            nodes.append(node)
            node = actions_to_delorean.create_action_node(action,USER % action)
            nodes.append(node)
            node = actions_to_delorean.create_action_node(action,DOMAIN % action)
            nodes.append(node)

        advertiser_node = actions_to_delorean.create_node('"source": "%s' % advertiser, children=nodes)
        advertiser_nodes.append(advertiser_node)

    edits = actions_to_delorean.create_edits(advertiser_nodes)
    actions_to_delorean.push_edits(api,edits, label="_patterns", filter_type="visits")

    
def run_cascade(advertiser,pattern,days,offset,callback):

    base = [advertiser,pattern]
    cascade = {
        0: base + [1,0, callback],
        1: base + [2,1, callback],
        3: base + [2,3, callback],
        5: base + [2,5, callback],
        7: base + [2,7, callback],
        9: base + [6,9, callback],
        15: base + [5,15, callback]

    }

    to_run = base + [1,offset,callback] if offset != days else False


    if to_run is not False:

        run(*to_run)
        offset = to_run[2]+to_run[3]
        work = (run_cascade,base + [days,offset,callback])

        callback(work)
    
    


def run(advertiser,pattern,days,offset,force=False):

    from link import lnk
    db = lnk.dbs.rockerbox
    api = lnk.api.rockerbox

    SKIP = "SELECT * FROM pattern_cache where pixel_source_name = '%s' and url_pattern = '%s' and (num_days >= %s or completed = 0)" 

    skip = db.select_dataframe(SKIP % (advertiser,pattern,days+offset))
    if force is not True and len(skip) > 0:
        return 

    db.execute("INSERT INTO pattern_cache (url_pattern,pixel_source_name,num_days) VALUES ('%s','%s',%s)" % (pattern,advertiser,days+offset))

    #update_tree(db,api)

    logging.info("Cacheing: %s => %s begin" % (advertiser,pattern))

    cache = build_cache(days,offset)
    select_args = [advertiser,pattern,select_callback,advertiser,pattern,[],[],[]]

    cache_insert, uid_values, url_values = select(cache,*select_args)

    # ACTION => RAW DATA CACHE
    logging.info("Cacheing: %s => %s occurences raw" % (advertiser,pattern))


    SELECT_COUNTER = "SELECT * from rockerbox.pattern_occurrence_u2_counter"
    UPDATE_COUNTER = "UPDATE rockerbox.pattern_occurrence_u2_counter"

    dimensions     = ["source","date","action","uid","u2"]
    to_count       = "url"
    count_column   = "occurrence"

    cache.run_counter_updates(cache_insert,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column,True)
    

    # ACTION => UIDS
    logging.info("Cacheing: %s => %s occurence uuids" % (advertiser,pattern))

    UID_INSERT     = "INSERT INTO rockerbox.pattern_occurrence_users_u2 (source,date,action,uid,u2) VALUES (?,?,?,?,?)"
    cache.run_inserts(uid_values,UID_INSERT)


    # ACTION => PAGE_URLS
    logging.info("Cacheing: %s => %s occurence urls" % (advertiser,pattern))

    SELECT_COUNTER = "SELECT * from rockerbox.pattern_occurrence_urls_counter" 
    UPDATE_COUNTER = "UPDATE rockerbox.pattern_occurrence_urls_counter" 

    dimensions     = ["source","date","action"]
    to_count       = "url"
    count_column   = "count"

    cache.run_counter_updates(url_values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column)


    # ACTION => DOMAINS
    logging.info("Cacheing: %s => %s occurance domains" % (advertiser,pattern))
    
    DOMAIN_SELECT = "select * from rockerbox.visitor_domains where uid = ?"
    DOMAIN_INSERT = "INSERT INTO rockerbox.pattern_occurrence_domains (source,date,action,domain) VALUES (?,?,?,?)"
    cache.run_uids_to_domains(uid_values,DOMAIN_SELECT,DOMAIN_INSERT)
    


    logging.info("Cacheing: %s => %s end" % (advertiser,pattern))

    db.execute("UPDATE pattern_cache set completed = 1 where pixel_source_name = '%s' and url_pattern = '%s'" % (advertiser,pattern))


    cache.cassandra.cluster.shutdown()

if __name__ == "__main__":
    import sys, time
    print sys.argv
    advertiser, pattern, days, offset, force = sys.argv[1:]
    start = time.time()
    run(advertiser, pattern, int(days), int(offset), bool(force))

    print time.time() - start
