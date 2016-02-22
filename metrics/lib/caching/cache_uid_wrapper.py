import pickle, pandas, json
import lib.caching.cache_uid_cassandra as cc
from link import lnk
from handlers.analytics.search.cache.pattern_search_cache import PatternSearchCacheWithConnector
from handlers.analytics.visit_domains_full import VisitDomainsFullHandler

QUERY ="INSERT INTO full_domain_cache_test (advertiser, url, count, uniques, pattern) VALUES ('{}', '{}',{}, {}, '{}')"
CASSQUERY=""


def make_request(advertiser,pattern):
    crusher = lnk.api.crusher
    crusher.user = "a_"+advertiser
    crusher.password="admin"
    crusher.authenticate()
    urls = crusher.get('/crusher/domains_visitor_full?format=json&url_pattern={}'.format(pattern))

    return urls.json

def add_to_table(advertiser_name, pattern, url, sql):
    #self.cassandra.execute(CASSQUERY)
    sql.execute(QUERY.format(advertiser_name, url["url"], url["count"],url["uniques"], pattern))

def run_wrapper(advertiser_name, pattern, connectors):
    urls = make_request(advertiser_name, pattern)
    for url in urls:
        add_to_table(advertiser_name, pattern, url, connectors['db'])
