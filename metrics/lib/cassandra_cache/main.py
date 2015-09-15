import logging
from cache import CassandraCache
from helpers import *

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


def run(advertiser,pattern,days,offset):

    from link import lnk
    db = lnk.dbs.rockerbox

    ACTIVE = "SELECT * FROM pattern_cache where pixel_source_name = '%s' and url_pattern = '%s' and completed = 0" % (advertiser,pattern)
    if len(db.select_dataframe(ACTIVE)) > 0:
        return 

    db.execute("INSERT INTO pattern_cache (url_pattern,pixel_source_name,num_days) VALUES ('%s','%s',%s)" % (pattern,advertiser,days))

    logging.info("Cacheing: %s => %s begin" % (advertiser,pattern))

    cache = build_cache(days,offset)
    select_args = [advertiser,pattern,select_callback,advertiser,pattern,[],[],[]]

    cache_insert, uid_values, url_values = select(cache,*select_args)

        
    # ACTION => RAW DATA CACHE
    logging.info("Cacheing: %s => %s occurences raw" % (advertiser,pattern))

    CACHE_INSERT   = "INSERT INTO rockerbox.action_occurrence_u1 (source,date,action,uid,u1,url,occurrence) VALUES (?,?,?,?,?,?,?)"
    cache.run_inserts(cache_insert,CACHE_INSERT)


    # ACTION => UIDS
    logging.info("Cacheing: %s => %s occurence uuids" % (advertiser,pattern))

    UID_INSERT     = "INSERT INTO rockerbox.action_occurrence_users_u2 (source,date,action,uid,u2) VALUES (?,?,?,?,?)"
    cache.run_inserts(uid_values,UID_INSERT)


    # ACTION => PAGE_URLS
    logging.info("Cacheing: %s => %s occurence urls" % (advertiser,pattern))

    SELECT_COUNTER = "SELECT * from rockerbox.action_occurrence_urls_counter" 
    UPDATE_COUNTER = "UPDATE rockerbox.action_occurrence_urls_counter" 

    dimensions     = ["source","date","action"]
    to_count       = "url"
    count_column   = "count"

    cache.run_counter_updates(url_values,SELECT_COUNTER,UPDATE_COUNTER,dimensions,to_count,count_column)


    # ACTION => DOMAINS
    logging.info("Cacheing: %s => %s occurance domains" % (advertiser,pattern))
    
    DOMAIN_SELECT = "select * from rockerbox.visitor_domains where uid = ?"
    DOMAIN_INSERT = "INSERT INTO rockerbox.action_occurrence_domains (source,date,action,domain) VALUES (?,?,?,?)"
    cache.run_uids_to_domains(uid_values,DOMAIN_SELECT,DOMAIN_INSERT)
    


    logging.info("Cacheing: %s => %s end" % (advertiser,pattern))

    db.execute("UPDATE pattern_cache set completed = 1 where pixel_source_name = '%s' and url_pattern = '%s'" % (advertiser,pattern))


    cache.cassandra.cluster.shutdown()

if __name__ == "__main__":
    import sys, time
    print sys.argv
    advertiser, pattern, days, offset = sys.argv[1:]
    start = time.time()
    run(advertiser, pattern, int(days), int(offset))

    print time.time() - start
