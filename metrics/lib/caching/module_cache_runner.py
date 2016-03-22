import pandas
import logging
from lib.pandas_sql import s as _sql

from cache_runner_base import BaseRunner

import datetime, ujson
import zlib, codecs, sys

current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

SQL_INSERT1 = "INSERT INTO before_and_after_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}',UNHEX({}))"
SQL_REPLACE1=" REPLACE before_and_after_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}','{}')"

SQL_INSERT2 = "INSERT INTO hourly_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}',UNHEX({}))"
SQL_REPLACE2=" REPLACE hourly_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}','{}')"

SQL_INSERT3 = "INSERT INTO sessions_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}',UNHEX({}))"
SQL_REPLACE3=" REPLACE sessions_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}','{}')"

SQL_INSERT4 = "INSERT INTO model_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}',UNHEX({}))"
SQL_REPLACE4=" REPLACE model_cache (advertiser, url_pattern, filter_id, endpoint, zipped) values ('{}','{}',{},'{}','{}')"

URL1 = "/crusher/v1/visitor/before_and_after?url_pattern={}"
URL2 = "/crusher/v1/visitor/hourly?url_pattern={}"
URL3 = "/crusher/v1/visitor/sessionsr?url_pattern={}"
URL4 = "/crusher/v1/visitor/model?url_pattern={}"

class ModuleRunner(BaseRunner):

    def __init__(self, connectors):
        self.connectors =connectors

    def make_request(self,crusher, pattern, endpoint):
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
        url = URL.format(pattern)
        resp = crusher.get(url, timeout=300)
        return resp.json

    def compress(self, data):
        compressed = zlib.compress(data)
        hexify = codecs.getencoder('hex')
        compress_as_hex = hexify(compressed)
        return compress_as_hex[0]

    def insert(self, advertiser, pattern, endpoint,filter_id, compressed_data):
        try:
            if endpoint == "before_and_after":
                self.connectors['db'].execute(SQL_INSERT1.format(advertiser, pattern, filter_id, endpoint, compressed_data))
            elif endpoint == "hourly":
                self.connectors['db'].execute(SQL_INSERT2.format(advertiser, pattern, filter_id, endpoint, compressed_data))
            elif endpoint == "sessions":
                self.connectors['db'].execute(SQL_INSERT3.format(advertiser, pattern, filter_id, endpoint, compressed_data))
            elif endpoint == "model":
                self.connectors['db'].execute(SQL_INSERT4.format(advertiser, pattern, filter_id, endpoint, compressed_data))
        except:
            if endpoint == "before_and_after":
                self.connectors['db'].execute(SQL_REPLACE1.format(advertiser, pattern, filter_id, endpoint, compressed_data))
            elif endpoint == "hourly":
                self.connectors['db'].execute(SQL_REPLACE2.format(advertiser, pattern, filter_id, endpoint, compressed_data))
            elif endpoint == "sessions":
                self.connectors['db'].execute(SQL_REPLACE3.format(advertiser, pattern, filter_id, endpoint, compressed_data))
            elif endpoint == "model":
                self.connectors['db'].execute(SQL_REPLACE4.format(advertiser, pattern, filter_id, endpoint, compressed_data))


def runner(advertiser,pattern, endpoint, filter_id, base_url, cache_date="", indentifiers="test", connectors=False):

    connectors = connectors or MR.get_connectors()
    
    MR = ModuleRunner(connectors)
    crusher = MR.get_crusher_obj(advertiser, base_url)

    db = connectors['db']
    zk = connectors['zk']
    data = MR.make_request(crusher, pattern, endpoint)

    compress_data = MR.compress(ujson.dumps(data))
    try:
        MR.insert(advertiser, pattern, endpoint, filter_id, compress_data)
        logging.info("Data inserted")
    except:
        logging.info("Data not inserted")
