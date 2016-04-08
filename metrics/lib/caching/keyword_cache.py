import pickle, pandas, json
from link import lnk
from lib.pandas_sql import s as _sql
import logging

#QUERY ="INSERT INTO keyword_crusher_cache (advertiser, url_pattern, keyword, count, uniques) VALUES ('{}', '{}','{}', {}, {})"
QUERY ="INSERT INTO keyword_crusher_cache (advertiser, url_pattern, keyword, count) VALUES ('{}', '{}','{}',{})"

def get_connectors():
    return {
        "crushercache": lnk.dbs.crushercache,
        "zk": {},
        "cassandra": lnk.dbs.cassandra
    }

def make_request(advertiser,pattern, base_url):
    crusher = lnk.api.crusher
    crusher.user = "a_"+advertiser
    crusher.password="admin"
    crusher.base_url = base_url
    crusher.authenticate()
    urls = crusher.get('/crusher/v1/visitor/keywords?format=json&url_pattern={}'.format(pattern), timeout=91)
    return urls.json

def insert(df, advertiser, segment_name, db):
    df_filtered = df.filter(['uniques', 'url'])
    table_name ="keyword_crusher_cache"
    keys = []
    batch_num = int(len(df_filtered) / 50)+1
    for batch in range(0, batch_num):
        if batch==0:
            to_insert = df_filtered.ix[0:50]
            to_insert['url_pattern'] = [segment_name] * len(to_insert)
            to_insert['advertiser'] = [advertiser] * len(to_insert)
        else:
            to_insert = df_filtered.ix[batch*50+1:(batch+1)*50]
            to_insert['url_pattern'] = [segment_name] * len(to_insert)
            to_insert['advertiser'] = [advertiser] * len(to_insert)
        if len(to_insert)>0:
            try:
                to_insert['url'] = to_insert['url'].map(lambda x : x.encode('utf-8'))
                to_insert.columns = ['count', 'keyword', 'url_pattern', 'advertiser']
                _sql._write_mysql(to_insert, table_name, list(to_insert.columns), db, keys)
                logging.info("inserted %s records for advertiser username (includes a_) %s" % (len(to_insert), advertiser))
            except:
                logging.info("error with df for %s and %s" % (segment_name, advertiser))


def add_to_table(advertiser_name, pattern, url, sql):
    if int(url['uniques']) >1:
        #sql.execute(QUERY.format(advertiser_name, pattern, url["keyword"], url["count"]))
        sql.execute(QUERY.format(advertiser_name, pattern, url["url"].replace("'","").replace("+","").encode('utf-8'), url["uniques"]))

def runner(advertiser_name, pattern, base_url, cache_date, indentifiers="test", connectors=False):
    connectors = connectors or get_connectors()

    db = connectors['crushercache']
    urls = make_request(advertiser_name, pattern, base_url)
    df = pandas.DataFrame(urls)
    insert(df, advertiser_name, pattern, db)
    #for url in urls:
    #add_to_table(advertiser_name, pattern, url, db)

