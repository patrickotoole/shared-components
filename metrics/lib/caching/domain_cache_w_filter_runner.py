import pandas
import logging
from lib.pandas_sql import s as _sql
from link import lnk
from cache_runner_base import BaseRunner

import datetime
import ujson
import uuid
import zlib
import codecs
import sys

current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

SQL_INSERT1 = "INSERT INTO cache_domains_w_filter_id (advertiser, url_pattern, filter_id, zipped) values ('{}','{}',{},UNHEX({}))"
SQL_REPLACE1=" REPLACE cache_domains_w_filter_id (advertiser, url_pattern, filter_id, zipped) values ('{}','{}',{},'{}')"

SQL_INSERT2 = "INSERT INTO cache_domains_full_w_filter_id (advertiser, url_pattern, filter_id, zipped) values ('{}','{}',{},UNHEX({}))"
SQL_REPLACE2=" REPLACE cache_domains_full_w_filter_id (advertiser, url_pattern, filter_id, zipped) values ('{}','{}',{},'{}')"

URL1 = "/crusher/v1/visitor/domains?format=json&url_pattern={}"
URL2 = "/crusher/v1/visitor/domains_full?format=json&url_pattern={}"
URL11 = "/crusher/v1/visitor/domains_full?format=json&num_users=30000&num_days=7&url_pattern={}"
URL22 = "/crusher/v1/visitor/domains_full?format=json&num_users=30000&num_days=7&url_pattern={}"

class DomainsCacheRunner(BaseRunner):

    def __init__(self, connectors):
        self.connectors =connectors
        self.selection_dict = {"domains":{"Insert":SQL_INSERT1, "Replace":SQL_REPLACE1}, "domains_full":{"Insert":SQL_INSERT2, "Replace":SQL_REPLACE2}}

    def featured_seg(self,advertiser, segment):
        sql = lnk.dbs.rockerbox
        query = "select featured from action a join action_patterns b on a.action_id = b.action_id where b.url_pattern='{}' and a.pixel_source_name='{}'"
        featured = sql.select_dataframe(query.format(segment, advertiser))
        try:
            featured_value = featured['featured'][0]
        except:
            featured_value = 0
        return featured_value 


    def make_request(self,crusher, pattern, endpoint, filter_id, featured):
        if endpoint == "domains":
            if int(featured)==1:
                URL=URL11
            else:
                URL = URL1
        elif endpoint == "domains_full":
            if int(featured) ==1:
                URL=URL22
            else:
                URL = URL2
        else:
            print "Not a vavlid endpoint"
            sys.exit()
        if filter_id !=0:
            with_filter_id = "{}&filter_id={}"
            url = URL.format(with_filter_id.format(pattern, filter_id))
        else:
            url = URL.format(pattern)
        resp = crusher.get(url, timeout=300)
        try:
            return resp.json
        except:
            return resp.text

    def compress(self, data):
        compressed = zlib.compress(data)
        hexify = codecs.getencoder('hex')
        compress_as_hex = hexify(compressed)
        return compress_as_hex[0]

    def insert(self, advertiser, pattern, endpoint,filter_id, compressed_data):
        try:
            Q = self.selection_dict.get(endpoint, False)['Insert']
            if Q:
                self.connectors['crushercache'].execute(Q.format(advertiser, pattern, filter_id, compressed_data))
        except:
            Q = self.selection_dict.get(endpoint, False)['Replace']
            if Q:
                self.connectors['crushercache'].execute(Q.format(advertiser, pattern, filter_id, compressed_data))

def runner(advertiser,pattern, endpoint, filter_id, base_url, cache_date="", indentifiers="test", connectors=False):

    connectors = connectors or DR.get_connectors()

    uuid_num = str(uuid.uuid4()) 
    DR = DomainsCacheRunner(connectors)
    if endpoint=='domains':
        DR.accounting_entry_start(advertiser, pattern, "domains_cache_w_filter_id", uuid_num)
    elif endpoint=='domains_full':
        DR.accounting_entry_start(advertiser, pattern, "domains_full_cache_w_filter_id", uuid_num)
    crusher = DR.get_crusher_obj(advertiser, base_url)

    db = connectors['crushercache']
    zk = connectors['zk']
    featured = DR.featured_seg(advertiser, pattern)
    data = DR.make_request(crusher, pattern, endpoint, filter_id, featured)

    compress_data = DR.compress(ujson.dumps(data))
    try:
        DR.insert(advertiser, pattern, endpoint, filter_id, compress_data)
        logging.info("Data inserted")
        if endpoint=='domains':
            DR.accounting_entry_end(advertiser, pattern, "domains_cache_w_filter_id", uuid_num)
        elif endpoint=='domains_full':
            DR.accounting_entry_end(advertiser, pattern, "domains_full_cache_w_filter_id", uuid_num)
    except:
        logging.info("Data not inserted")
    
