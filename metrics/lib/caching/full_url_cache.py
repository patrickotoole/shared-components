import pickle, pandas, json
from link import lnk
from lib.pandas_sql import s as _sql
import datetime
import logging

INSERT_QUERY ="INSERT INTO full_domain_cache_test (advertiser, url, count, uniques, url_pattern) VALUES ('{}', '{}',{}, {}, '{}')"
REPLACE_QUERY="REPLACE INTO full_domain_cache_test (advertiser, url, count, uniques, url_pattern) VALUES ('{}', '{}',{}, {}, '{}')"
CASSQUERY=""

def get_connectors():
    return {
        "crushercache": lnk.dbs.crushercache,
        "zk": {},
        "cassandra": lnk.dbs.cassandra
    }


def insert(df, advertiser, segment_name, db):
    current_datetime = datetime.datetime.now()
    df_filtered = df.filter(['url', 'count'])
    table_name ="full_domain_cache_test"
    keys = ['advertiser', 'url_pattern']
    batch_num = int(len(df_filtered) / 50)+1
    for batch in range(0, batch_num):
        if batch==0:
            to_insert = df_filtered.ix[0:50]
            to_insert['ts'] = [current_datetime] * len(to_insert)
            to_insert['url_pattern'] = [segment_name] * len(to_insert)
            to_insert['advertiser'] = [advertiser] * len(to_insert)
        else:
            to_insert = df_filtered.ix[batch*50+1:(batch+1)*50]
            to_insert['ts'] = [current_datetime] * len(to_insert)
            to_insert['url_pattern'] = [segment_name] * len(to_insert)
            to_insert['advertiser'] = [advertiser] * len(to_insert)
        if len(to_insert)>0:
            try:
                to_insert['url'] = to_insert['url'].map(lambda x : x.encode('utf-8').replace("'",""))
                _sql._write_mysql(to_insert, table_name, list(to_insert.columns), db, keys)
                logging.info("inserted %s records for advertiser username (includes a_) %s" % (len(to_insert), advertiser))
            except:
                logging.info("error with df for %s and %s" % (segment_name, advertiser))

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
    df = pandas.DataFrame(urls)
    insert(df, advertiser_name, pattern, db)
    #for url in urls:
    #add_to_table(advertiser_name, pattern, url, db)


