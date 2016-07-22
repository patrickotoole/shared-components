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

URL ="/crusher/v1/visitor/{}?url_pattern={}&filter_id={}"
URL2 ="/crusher/v2/visitor/{}?url_pattern={}&filter_id={}"

INSERT ="insert into generic_function_cache (advertiser, url_pattern, udf, zipped, date, action_id) values (%s, %s, %s, %s, %s, %s)"
REPLACE="replace into generic_function_cache (advertiser, url_pattern, udf, zipped, date, action_id) values (%s, %s, %s, %s, %s, %s)"

INSERT2 ="insert into generic_function_cache_v2 (advertiser, url_pattern, udf, zipped, date, action_id) values (%s, %s, %s, %s, %s, %s)"
REPLACE2="replace into generic_function_cache_v2 (advertiser, url_pattern, udf, zipped, date, action_id) values (%s, %s, %s, %s, %s, %s)"

QUERY = "select parameters from user_defined_functions where advertiser = '{}' and udf = '{}'"
QUERY2 = "select parameters from user_defined_functions where advertiser is NULL and udf = '{}'"

class UDFRunner(BaseRunner):

    def __init__(self, connectors, advertiser, base_url):
        self.connectors =connectors
        self.advertiser = advertiser
        self.crusher = connectors.get('crusher_wrapper',False) or self.get_crusher_obj(advertiser, base_url)

    def get_parameters(self, db, udf):
        params = db.select_dataframe(QUERY.format(self.advertiser, udf))
        if len(params)==0:
            params = db.select_dataframe(QUERY2.format(udf))
        if len(params)>0 and params['parameters'][0] is not None:
            rp = ujson.loads(params['parameters'][0])
        else:
            rp = {}
        return rp

    def make_request(self, pattern, func_name, params):
        new_URL = False
        if len(params)>0:
            new_URL = URL
            try:
                for key,value in params.items():
                    stem = "&%s=%s"
                    new_URL += stem % (str(key), str(value))
            except:
                logging.info("could not read parameters")

        _url = new_URL or URL
        url = _url.format(func_name, pattern, self.action_id)
        logging.info(url)
        resp = self.crusher.get(url, timeout=300)
        resp.raise_for_status()
        try:
            if 'similarity' in resp.json.keys():
                if len(resp.json['similarity']) <1:
                    raise Exception("Empty response from Beta, not caching data. Check response for %s" % url)
            if 'hourly_visits' in resp.json.keys():
                if len(resp.json['hourly_visits']) <1:
                    raise Exception("Empty response from Beta, not caching data. Check response for %s" % url)
            if 'hourly_domains' in resp.json.keys():
                if len(resp.jsonp['hourly_domains'])<1:
                    raise Exception("Empty response from Beta, not caching data. Check response for %s" % url)
            if 'before_categories' in resp.json.keys():
                if len(resp.json['before_categories']) <1:
                    raise Exception("Empty response from Beta, not caching data. Check response for %s" % url)
            if 'response' in resp.json.keys():
                if len(resp.json['response']) <1:
                    raise Exception("Empty response from Beta, not caching data. Check response for %s" % url)
            return resp.json
        except Exception as e:
            logging.info(e)
            raise Exception(e)

    def make_request_v2(self,crusher, pattern, func_name, parameters):
        url = URL2.format(func_name, pattern, self.action_id)
        resp = self.crusher.get(url, timeout=300)
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

    def insert(self, pattern, func_name, compressed_data):
        try:
            Q = INSERT
            self.connectors['crushercache'].execute(Q, (self.advertiser, pattern, func_name, compressed_data, now_date, self.action_id))
        except:
            Q = REPLACE
            self.connectors['crushercache'].execute(Q, (self.advertiser, pattern, func_name, compressed_data, now_date, self.action_id))

    def insert2(self, advertiser, pattern, func_name, compressed_data):
        try:
            Q = INSERT2
            self.connectors['crushercache'].execute(Q, (self.advertiser, pattern, func_name, compressed_data, now_date, self.action_id))
        except:
            Q = REPLACE2
            self.connectors['crushercache'].execute(Q, (self.advertiser, pattern, func_name, compressed_data, now_date, self.action_id))

def runner(**kwargs):
    #add other parameters options that can be added on to url request
    connectors = kwargs['connectors']
    if not kwargs.get('job_id',False):
        uuid_num = "local_"+str(uuid.uuid4())
    else:
        uuid_num = kwargs['job_id']

    base_url = kwargs.get('base_url', "http://beta.crusher.getrockerbox.com")
    UR = UDFRunner(connectors, kwargs['advertiser'], base_url)
    
    func_name = kwargs['func_name']
    pattern = kwargs['pattern']
    identifiers=kwargs.get('identifiers',"test")
    filter_id = kwargs.get('filter_id',False)

    if not filter_id:
        UR.getActionIDPattern(pattern, UR.crusher)
    else:
        UR.action_id = filter_id

    UR.accounting_entry_start(UR.advertiser, pattern, func_name, uuid_num, UR.action_id)

    db = connectors['crushercache']
    zk = connectors['zk']
   
    parameters = kwargs.get("parameters",False)
    if parameters:
        parameters = dict(parameters)
    else:
        parameters = UR.get_parameters(db, func_name)

    data = UR.make_request(pattern, func_name, parameters)
    #data2 = UR.make_request_v2(crusher, pattern, func_name, parameters)

    compress_data = UR.compress(ujson.dumps(data))
    #compress_data2 = UR.compress(ujson.dumps(data2))
    UR.insert( pattern, func_name, compress_data)
    #UR.insert2(advertiser, pattern, func_name, compress_data2)
    logging.info("Data inserted")
    UR.accounting_entry_end(UR.advertiser, pattern, func_name, uuid_num, UR.action_id)
