import logging
from cache import CassandraCache



def build_cache():
    from link import lnk
    import pandas

    c = lnk.dbs.cassandra
    SELECT = "SELECT date, group_and_count(url,uid) FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered"
    FIELDS = ["source","date"]

    cache = CassandraCache(c,SELECT,FIELDS,"u2","",days,offset) 
    return cache
    
def cache_select(cache,*args):
    logging.info("Cacheing: selecting %s => %s" % (args[0],args[1]))
    _, _, cache_insert, uid_values, url_values = cache.run_select(*args)

    return (cache_insert, uid_values, url_values)

def cache_raw(cache,cache_insert):
    # ACTION => RAW DATA CACHE
    logging.info("Cacheing: %s => %s occurences raw" % (advertiser,pattern))

    CACHE_INSERT   = "INSERT INTO rockerbox.action_occurrence_u1 (source,date,action,uid,u1,url,occurrence) VALUES (?,?,?,?,?,?,?)"
    cache.run_inserts(cache_insert,CACHE_INSERT)


def run(advertiser,pattern,days,offset):

    logging.info("Cacheing: %s => %s begin" % (advertiser,pattern))

    cache = build_cache()
    select_args = [advertiser,pattern,select_callback,advertiser,pattern,[],[],[]]

    cache_insert, uid_values, url_values = cache_select(cache,*select_args)
    

    # ACTION => DOMAINS
    logging.info("Cacheing: %s => %s occurance domains" % (advertiser,pattern))
    
    DOMAIN_SELECT = "select * from rockerbox.visitor_domains where uid = ?"
    DOMAIN_INSERT = "INSERT INTO rockerbox.action_occurrence_domains (source,date,action,domain) VALUES (?,?,?,?)"
    cache.run_uids_to_domains(uid_values,DOMAIN_SELECT,DOMAIN_INSERT)


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
    
    logging.info("Cacheing: %s => %s end" % (advertiser,pattern))

    import ipdb; ipdb.set_trace()

if __name__ == "__main__":
    import sys, time
    print sys.argv
    advertiser, pattern, days, offset = sys.argv[1:]
    start = time.time()
    run(advertiser, pattern, int(days), int(offset))

    print time.time() - start
