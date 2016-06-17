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

URL ="/crusher/v1/visitor/{}?url_pattern={}&filter_id={}&prevent_sample=true"
URL2 ="/crusher/v2/visitor/{}?url_pattern={}&filter_id={}"

INSERT ="insert into generic_function_cache (advertiser, url_pattern, udf, zipped, date, action_id) values (%s, %s, %s, %s, %s, %s)"
REPLACE="replace into generic_function_cache (advertiser, url_pattern, udf, zipped, date, action_id) values (%s, %s, %s, %s, %s, %s)"

INSERT2 ="insert into generic_function_cache_v2 (advertiser, url_pattern, udf, zipped, date, action_id) values (%s, %s, %s, %s, %s, %s)"
REPLACE2="replace into generic_function_cache_v2 (advertiser, url_pattern, udf, zipped, date, action_id) values (%s, %s, %s, %s, %s, %s)"

QUERY = "select parameters from user_defined_functions where advertiser = '{}' and udf = '{}'"
QUERY2 = "select parameters from user_defined_functions where advertiser is NULL and udf = '{}'"

class UDFRunner(BaseRunner):

    def __init__(self, connectors):
        self.connectors =connectors

    def get_parameters(self, db, advertiser, udf):
        params = db.select_dataframe(QUERY.format(advertiser, udf))
        if len(params)==0:
            params = db.select_dataframe(QUERY2.format(udf))
        return params

    def make_request(self,crusher, pattern, func_name, params):
        new_URL = False
        if len(params)>0:
            new_URL = URL
            try:
                parameters_dict = ujson.loads(params['parameters'][0])
                for key,value in parameters_dict.items():
                    stem = "&%s=%s"
                    new_URL += stem % (str(key), str(value))
            except:
                logging.info("could not read parameters")

        _url = new_URL or URL
        url = _url.format(func_name, pattern, self.action_id)
        resp = crusher.get(url, timeout=300)
        resp.raise_for_status()
        try:
            return resp.json
        except:
            return resp.text

    def make_request_v2(self,crusher, pattern, func_name, parameters):
        url = URL2.format(func_name, pattern, self.action_id)
        resp = crusher.get(url, timeout=300)
        resp.raise_for_status()
        try:
            return resp.json
        except:
            return resp.text

    def compress(self, data):
        compressed = zlib.compress(data)
        hexify = codecs.getencoder('hex')
        compress_as_hex = hexify(compressed)
        return compress_as_hex[0]

    def insert(self, advertiser, pattern, func_name, compressed_data):
        try:
            Q = INSERT
            self.connectors['crushercache'].execute(Q, (advertiser, pattern, func_name, compressed_data, now_date, self.action_id))
        except:
            Q = REPLACE
            self.connectors['crushercache'].execute(Q, (advertiser, pattern, func_name, compressed_data, now_date, self.action_id))

    def insert2(self, advertiser, pattern, func_name, compressed_data):
        try:
            Q = INSERT2
            self.connectors['crushercache'].execute(Q, (advertiser, pattern, func_name, compressed_data, now_date, self.action_id))
        except:
            Q = REPLACE2
            self.connectors['crushercache'].execute(Q, (advertiser, pattern, func_name, compressed_data, now_date, self.action_id))

def runner(advertiser,pattern, func_name, base_url, indentifiers="test", filter_id=False, job_id=False, connectors=False):

    #add other parameters options thhat can be added on to url request

    connectors = connectors or UDFRunner.get_connectors()
    if not job_id:
        uuid_num = "local_"+str(uuid.uuid4())
    else:
        uuid_num = job_id

    UR = UDFRunner(connectors)
    script_name = func_name
    crusher = UR.get_crusher_obj(advertiser, base_url)
    if not filter_id:
        UR.getActionIDPattern(pattern, crusher)
    else:
        UR.action_id = filter_id

    UR.accounting_entry_start(advertiser, pattern, func_name, uuid_num, UR.action_id)
    crusher = UR.get_crusher_obj(advertiser, base_url)

    db = connectors['crushercache']
    zk = connectors['zk']
    
    parameters = UR.get_parameters(db, advertiser, func_name)

    try:
        data = UR.make_request(crusher, pattern, func_name, parameters)
        #data2 = UR.make_request_v2(crusher, pattern, func_name, parameters)

        compress_data = UR.compress(ujson.dumps(data))
        #compress_data2 = UR.compress(ujson.dumps(data2))
        UR.insert(advertiser, pattern, func_name, compress_data)
        #UR.insert2(advertiser, pattern, func_name, compress_data2)
        logging.info("Data inserted")
        UR.accounting_entry_end(advertiser, pattern, func_name, uuid_num, UR.action_id)
    except Exception as e:
        logging.info(e)
        logging.info("Data not inserted")
