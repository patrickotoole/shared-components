import logging

def build_cache(days,offset,udf_name):
    from link import lnk
    from cache import CassandraCache

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


