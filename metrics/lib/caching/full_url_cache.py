import pickle, pandas, json
from handlers.analytics.search.cache.pattern_search_cache import PatternSearchCacheWithConnector
from handlers.analytics.visitor_domains.visit_domains_full import VisitDomainsFullHandler

QUERY ="INSERT INTO full_domain_cache_test (advertiser, url, count, uniques, url_pattern) VALUES ('{}', '{}',{}, {}, '{}')"
CASSQUERY=""

def get_connectors():
    from link import lnk
    return {
        "db": lnk.dbs.rockerbox,
        "zk": {},
        "cassandra": lnk.dbs.cassandra
    }

def make_request(advertiser,pattern, base_url):
    crusher = lnk.api.crusher
    crusher.user = "a_"+advertiser
    crusher.password="admin"
    crusher.base_url = base_url
    crusher.authenticate()
    urls = crusher.get('/crusher/domains_visitor_full?format=json&url_pattern={}'.format(pattern))
    return urls.json

def add_to_table(advertiser_name, pattern, url, sql):
    #self.cassandra.execute(CASSQUERY)
    if int(url['uniques']) >1:
        sql.execute(QUERY.format(advertiser_name, url["url"], url["count"],url["uniques"], pattern))

def run_wrapper(advertiser_name, pattern, base_url, cache_date, indentifiers="test", connectors=False):
    from link import lnk
    connectors = connectors or get_connectors()

    db = connectors['db']

    crusher = lnk.api.crusher
    crusher.user = "a_"+advertiser
    crusher.password="admin"
    crusher.base_url = base_url
    crusher.authenticate()
    urls = crusher.get('/crusher/domains_visitor_full?format=json&url_pattern={}'.format(pattern))
    for url in urls:
        db.execute(QUERY.format(advertiser_name, url["url"], url["count"],url["uniques"], pattern))


def run_domains_cache(advertiser,pattern,cache_date, indentifiers="test", connectors=False):
    connectors = connectors or get_connectors()

    db = connectors['db']
    zk = connectors['zk']

    user_format = "a_{}"
    username = user_format.format(advertiser)
    AC = adc.ActionCache(username, "admin",db, zk)
    logging.info("Action Cache class instance created and initiated")
    adc.run_advertiser_segment(AC,pattern)
    logging.info("ran run advertiser segment for %s and %s" % (advertiser, pattern))
