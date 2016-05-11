import pickle, pandas, json
from link import lnk
from lib.pandas_sql import s as _sql
import datetime
import logging
import uuid
from cache_runner_base import BaseRunner

INSERT_QUERY ="INSERT INTO full_domain_cache_test (advertiser, url, count, uniques, url_pattern) VALUES ('{}', '{}',{}, {}, '{}')"
REPLACE_QUERY="REPLACE INTO full_domain_cache_test (advertiser, url, count, uniques, url_pattern) VALUES ('{}', '{}',{}, {}, '{}')"

current_datetime = datetime.datetime.now().strftime("%Y-%m-%d")

class FullDomainRunner(BaseRunner):

    def insert(self, df, advertiser, segment_name):
        current_datetime = datetime.datetime.now()
        df_filtered = df.filter(['url', 'count', 'uniques'])
        table_name ="domains_full_cache"
        keys = ['advertiser', 'url_pattern']
        batch_num = int(len(df_filtered) / 50)+1
        for batch in range(0, batch_num):
            if batch==0:
                to_insert = df_filtered.ix[0:50]
                to_insert['ts'] = [current_datetime] * len(to_insert)
                to_insert['url_pattern'] = [segment_name] * len(to_insert)
                to_insert['advertiser'] = [advertiser] * len(to_insert)
                to_insert['record_date'] = current_datetime
            else:
                to_insert = df_filtered.ix[batch*50+1:(batch+1)*50]
                to_insert['ts'] = [current_datetime] * len(to_insert)
                to_insert['url_pattern'] = [segment_name] * len(to_insert)
                to_insert['advertiser'] = [advertiser] * len(to_insert)
                to_insert['record_date'] = current_datetime
            if len(to_insert)>0:
                try:
                    to_insert['url'] = to_insert['url'].map(lambda x : x.encode('utf-8').replace("'",""))
                    _sql._write_mysql(to_insert, table_name, list(to_insert.columns), self.connectors['crushercache'].create_connection(), keys)
                    logging.info("inserted %s records for advertiser username (includes a_) %s" % (len(to_insert), advertiser))
                except:
                    logging.info("error with df for %s and %s" % (segment_name, advertiser))

    def make_request(self, advertiser,pattern, base_url, featured):
        crusher = lnk.api.crusher
        crusher.user = "a_"+advertiser
        crusher.password="admin"
        crusher.base_url = base_url
        crusher.authenticate()
        if int(featured) ==1:
            urls = crusher.get('/crusher/v1/visitor/domains_full?format=json&num_users=30000&num_days=7&url_pattern={}'.format(pattern), timeout=91)
        else:
            urls = crusher.get('/crusher/v1/visitor/domains_full?format=json&url_pattern={}&num_days=7'.format(pattern), timeout=91)
        return urls.json

    def featured_seg(self, advertiser, segment):
        query = "select featured from action a join action_patterns b on a.action_id = b.action_id where b.url_pattern='{}' and a.pixel_source_name='{}'"
        sql = lnk.dbs.rockerbox
        featured = sql.select_dataframe(query.format(segment, advertiser))
        try:
            featured_value = featured['featured'][0]
        except:
            featured_value=0
        return featured_value

    def add_to_table(self, advertiser_name, pattern, url, sql):
        #self.cassandra.execute(CASSQUERY)
        if int(url['uniques']) >1:
            try:
                sql.execute(INSERT_QUERY.format(advertiser_name, url["url"], url["count"],url["uniques"], pattern))
            except:
                sql.execute(REPLACE_QUERY.format(advertiser_name, url["url"], url["count"],url["uniques"], pattern))

def runner(advertiser_name, pattern, base_url, cache_date, indentifiers="test", connectors=False):
    connectors = connectors or FullDomainRunner.get_connectors()
    uuid_num = str(uuid.uuid4())
    FDR = FullDomainRunner(connectors)
    FDR.accounting_entry_start(advertiser_name, pattern, "full_url_cache_runner",  uuid_num)
    featured = FDR.featured_seg(advertiser_name, pattern)
    urls = FDR.make_request(advertiser_name, pattern, base_url, featured)
    df = pandas.DataFrame(urls['response'])
    FDR.insert(df, advertiser_name, pattern)
    FDR.accounting_entry_end(advertiser_name, pattern, "full_url_cache_runner", uuid_num)
