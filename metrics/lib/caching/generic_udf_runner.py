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
        #set default parameters of unsampled and 2 days for requests run on wq
        if "prevent_sample" not in params.keys():
            params['prevent_sample'] = 'true'
        if "num_days" not in params.keys():
            params['num_days'] = 2
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
        try:
            resp = self.crusher.get(url, timeout=600, allow_redirects=False)
        except:
            logging.info("failed unsampled")
            #fall back if initial set of parameters fails try sampled url without parameters
            resp = self.crusher.get(URL.format(func_name, pattern, self.action_id), timeout=300, allow_redirects=False)

        if resp.status_code != 200:
            raise Exception("Response is not 200, response is %s with error %s" % (resp.status_code, resp.text))         

        if resp.status_code == 502:
            import time
            time.sleep(30)
            raise Exception("Response is not 200, response is %s so sleeping for 30 seconds to minimize error contagion") 

        try:
            if 'similarity' in resp.json.keys():
                if len(resp.json['similarity']) <1:
                    raise Exception("Empty response from Beta, not caching data. Check response for %s" % url)
            if 'hourly_visits' in resp.json.keys():
                if len(resp.json['hourly_visits']) <1:
                    raise Exception("Empty response from Beta, not caching data. Check response for %s" % url)
            if 'hourly_domains' in resp.json.keys():
                if len(resp.json['hourly_domains'])<1:
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
        resp = self.crusher.get(url, timeout=300, allow_redirects=False)
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

    def exclude_domain(self, advertiser, url):
        ARTIFACT1 = "select json from artifacts where advertiser = '%s' and key_name ='exclude_domains'"
        ARTIFACT2 = "select json from artifacts where advertiser is null and key_name ='exclude_domains'"
        ARTIFACT11 = "update artifacts set json='%s' where advertiser = '%s' and key_name ='exclude_domains'"
        ARTIFACT12 = "insert into artifacts (json, advertiser, key_name) values ('%s' , '%s' , 'exclude_domains')"
        db_connection = self.connectors['crushercache'].create_connection()
        url = db_connection.escape_string(url)
        json_obj = self.connectors['crushercache'].select_dataframe(ARTIFACT1 % advertiser)
        if len(json_obj) >0:
            urls = json_obj['json'][0]
            urls = urls[:-1] + ",\"" + url + "\"]"
            self.connectors['crushercache'].execute(ARTIFACT11 % (urls, advertiser))
        else:
            json_obj = self.connectors['crushercache'].select_dataframe(ARTIFACT2)
            urls = json_obj['json'][0]
            urls = urls[:-1] + ",\"" +url + "\"]"
            self.connectors['crushercache'].execute(ARTIFACT12 % (urls, advertiser))
            

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

    if func_name == 'exclude_domain':
        exclude_url = kwargs.get('url',False) or kwargs['parameters']['url']
        UR.exclude_domain(kwargs['advertiser'], exclude_url)
        raise Exception("Successful exit from domain exclusion")

    if not filter_id:
        UR.getActionIDPattern(pattern, UR.crusher)
    else:
        UR.action_id = filter_id

    UR.accounting_entry_start(UR.advertiser, pattern, func_name, uuid_num, UR.action_id)

    db = connectors['crushercache']
   
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
