import pickle, pandas, json
from link import lnk

INSERT_QUERY ="INSERT INTO full_domain_cache_test (advertiser, url, count, uniques, url_pattern) VALUES ('{}', '{}',{}, {}, '{}')"
REPLACE_QUERY="REPLACE INTO full_domain_cache_test (advertiser, url, count, uniques, url_pattern) VALUES ('{}', '{}',{}, {}, '{}')"
CASSQUERY=""

def get_connectors():
    return {
        "crushercache": lnk.dbs.crushercache,
        "zk": {},
        "cassandra": lnk.dbs.cassandra
    }

def make_request(advertiser,pattern, base_url, featured):
    crusher = lnk.api.crusher
    crusher.user = "a_"+advertiser
    crusher.password="admin"
    crusher.base_url = base_url
    crusher.authenticate()
    if int(featured) ==1:
        urls = crusher.get('/crusher/v1/visitor/domains_full?format=json&num_users=30000&num_days=7&url_pattern={}'.format(pattern), timeout=91)
    else:
        urls = crusher.get('/crusher/v1/visitor/domains_full?format=json&url_pattern={}'.format(pattern), timeout=91)
    return urls.json

def featured_seg(advertiser, segment):
    sql = lnk.dbs.rockerbox
    query = "select featured from action a join action_patterns b on a.action_id = b.action_id where b.url_pattern='{}' and a.pixel_source_name='{}'"
    featured = sql.select_dataframe(query.format(segment, advertiser))
    return featured['featured'][0]

def add_to_table(advertiser_name, pattern, url, sql):
    #self.cassandra.execute(CASSQUERY)
    if int(url['uniques']) >1:
        try:
            sql.execute(INSERT_QUERY.format(advertiser_name, url["url"], url["count"],url["uniques"], pattern))
        except:
            sql.execute(REPLACE_QUERY.format(advertiser_name, url["url"], url["count"],url["uniques"], pattern))

def runner(advertiser_name, pattern, base_url, cache_date, indentifiers="test", connectors=False):
    connectors = connectors or get_connectors()

    db = connectors['crushercache']
    featured = featured_seg(advertiser_name, pattern)
    urls = make_request(advertiser_name, pattern, base_url, featured)
    for url in urls:
        add_to_table(advertiser_name, pattern, url, db)


