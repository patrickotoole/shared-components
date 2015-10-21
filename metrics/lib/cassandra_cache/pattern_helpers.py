
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


