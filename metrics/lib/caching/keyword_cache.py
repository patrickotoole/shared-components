import pickle, pandas, json
from handlers.analytics.search.cache.pattern_search_cache import PatternSearchCacheWithConnector
from handlers.analytics.visitor_domains.visit_domains_full import VisitDomainsFullHandler

QUERY ="INSERT INTO keyword_crusher_cache (advertiser, url_pattern, keyword, count, uniques) VALUES ('{}', '{}','{}', {}, {})"

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
    urls = crusher.get('/crusher/search_visitor_domains?format=json&search_type=nltk&url_pattern={}'.format(pattern))
    return urls.json

def add_to_table(advertiser_name, pattern, url, sql):
    if int(url['uniques']) >1:
        sql.execute(QUERY.format(advertiser_name, pattern, url["keyword"], url["count"]))

def run_wrapper(advertiser_name, pattern, base_url, cache_date, indentifiers="test", connectors=False):
    from link import lnk
    connectors = connectors or get_connectors()

    db = connectors['db']

    urls = make_request(advertiser_name, pattern, base_url)
    for url in urls:
        add_to_table(advertiser_name, pattern, url, db)

