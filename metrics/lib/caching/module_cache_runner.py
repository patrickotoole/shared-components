import pandas
import logging
from lib.pandas_sql import s as _sql

from cache_runner_base import BaseRunner

import datetime
import ujson
import uuid
import zlib
import codecs
import sys

now_date = datetime.datetime.now().strftime("%Y-%m-%d")

SQL_INSERT = "INSERT INTO generic_function_cache (advertiser, url_pattern, action_id, udf, zipped, date) values ('{}','{}',{},'{}','{}', '{}')"
SQL_REPLACE=" REPLACE generic_function_cache (advertiser, url_pattern, action_id, udf, zipped, date) values ('{}','{}',{},'{}','{}', '{}')"

URL1 = "/crusher/v1/visitor/before_and_after?url_pattern={}"
URL2 = "/crusher/v1/visitor/hourly?url_pattern={}"
URL3 = "/crusher/v1/visitor/sessions?url_pattern={}"
URL4 = "/crusher/v1/visitor/model?url_pattern={}"

class ModuleRunner(BaseRunner):

    def __init__(self, connectors):
        self.connectors =connectors

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
            Q= SQL_INSERT
            self.connectors['crushercache'].execute(Q.format(advertiser, pattern, filter_id, endpoint, compressed_data, now_date))
        except:
            Q= SQL_REPLACE
            self.connectors['crushercache'].execute(Q.format(advertiser, pattern, filter_id, endpoint, compressed_data, now_date))

def runner(advertiser,pattern, endpoint, filter_id, base_url, cache_date="", indentifiers="test", connectors=False):

    connectors = connectors or MR.get_connectors()

    uuid_num = str(uuid.uuid4())
    MR = ModuleRunner(connectors)
    script_name = "module_{}".format(endpoint)
    MR.accounting_entry_start(advertiser, pattern, script_name, uuid_num)
    crusher = MR.get_crusher_obj(advertiser, base_url)

    db = connectors['crushercache']
    zk = connectors['zk']
    data = MR.make_request(crusher, pattern, endpoint, filter_id)

    compress_data = MR.compress(ujson.dumps(data))
    try:
        MR.insert(advertiser, pattern, endpoint, filter_id, compress_data)
        logging.info("Data inserted")
        MR.accounting_entry_end(advertiser, pattern, script_name, uuid_num)
    except:
        logging.info("Data not inserted")
