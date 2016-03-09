import pickle, pandas, json
from link import lnk

INSERT_QUERY ="INSERT INTO full_domain_cache_test (advertiser, url, count, uniques, url_pattern) VALUES ('{}', '{}',{}, {}, '{}')"
REPLACE_QUERY="REPLACE full_domain_cache_test (advertiser, url, count, uniques, url_pattern) VALUES ('{}', '{}',{}, {}, '{}')"
CASSQUERY=""

def get_connectors():
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
    urls = crusher.get('/crusher/domains_visitor_full?format=json&url_pattern={}'.format(pattern), timeout=91)
    return urls.json

def add_to_table(advertiser_name, pattern, url, sql):
    #self.cassandra.execute(CASSQUERY)
    if int(url['uniques']) >1:
        try:
            sql.execute(INSERT_QUERY.format(advertiser_name, url["url"], url["count"],url["uniques"], pattern))
        except:
            sql.execute(REPLACE_QUERY.format(advertiser_name, url["url"], url["count"],url["uniques"], pattern))

def runner(advertiser_name, pattern, base_url, cache_date, indentifiers="test", connectors=False):
    connectors = connectors or get_connectors()

    db = connectors['db']
    urls = make_request(advertiser_name, pattern, base_url)
    for url in urls:
        add_to_table(advertiser_name, pattern, url, db)


