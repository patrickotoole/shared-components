import pandas
import logging
from lib.pandas_sql import s as _sql

from cache_runner_base import BaseRunner

import datetime, ujson
import zlib, codecs, sys

current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

SQL_INSERT1 = "INSERT INTO transform_before_and_after_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}',UNHEX({}))"
SQL_REPLACE1=" REPLACE transform_before_and_after_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}','{}')"

SQL_INSERT2 = "INSERT INTO transform_hourly_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}',UNHEX({}))"
SQL_REPLACE2=" REPLACE transform_hourly_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}','{}')"

SQL_INSERT3 = "INSERT INTO transform_sessions_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}',UNHEX({}))"
SQL_REPLACE3=" REPLACE transform_sessions_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}','{}')"

SQL_INSERT4 = "INSERT INTO transform_model_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}',UNHEX({}))"
SQL_REPLACE4=" REPLACE transform_model_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}','{}')"

URL1 = "/crusher/v1/visitor/before_and_after?url_pattern={}"
URL2 = "/crusher/v1/visitor/hourly?url_pattern={}"
URL3 = "/crusher/v1/visitor/sessions?url_pattern={}"
URL4 = "/crusher/v1/visitor/model?url_pattern={}"

class ModuleRunner(BaseRunner):

    def __init__(self, connectors):
        self.connectors =connectors
        self.selection_dict = {"before_and_after":{"Insert":SQL_INSERT1, "Replace":SQL_REPLACE1}, "hourly":{"Insert":SQL_INSERT2, "Replace":SQL_REPLACE2}, "sessions": {"Insert":SQL_INSERT3, "Replace":SQL_REPLACE3}, "model":{"Insert":SQL_INSERT4, "Replace":SQL_REPLACE4}}

    def make_request(self,crusher, pattern, endpoint, filter_id):
        if endpoint == "before_and_after":
            URL = URL1
        elif endpoint == "hourly":
            URL = URL2
        elif endpoint == "sessions":
            URL = URL3
        elif endpoint == "model":
            URL = URL4
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
                self.connectors['crushercache'].execute(Q.format(advertiser, pattern, filter_id, endpoint, compressed_data))
        except:
            Q = self.selection_dict.get(endpoint, False)['Replace']
            if Q:
                self.connectors['crushercache'].execute(Q.format(advertiser, pattern, filter_id, endpoint, compressed_data))

def runner(advertiser,pattern, endpoint, filter_id, base_url, cache_date="", indentifiers="test", connectors=False):

    connectors = connectors or MR.get_connectors()
    
    MR = ModuleRunner(connectors)
    crusher = MR.get_crusher_obj(advertiser, base_url)

    db = connectors['crushercache']
    zk = connectors['zk']
    data = MR.make_request(crusher, pattern, endpoint, filter_id)

    compress_data = MR.compress(ujson.dumps(data))
    try:
        MR.insert(advertiser, pattern, endpoint, filter_id, compress_data)
        logging.info("Data inserted")
    except:
        logging.info("Data not inserted")
