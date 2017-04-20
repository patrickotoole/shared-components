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
from lib.helpers import UDF_EXCLUDES

URL ="/crusher/v1/visitor/{}?url_pattern={}&filter_id={}"
URL2 ="/crusher/v2/visitor/{}?url_pattern={}&filter_id={}"

INSERT ="insert into generic_function_cache (advertiser, url_pattern, udf, zipped, date, action_id) values (%s, %s, %s, %s, %s, %s)"
REPLACE="replace into generic_function_cache (advertiser, url_pattern, udf, zipped, date, action_id) values (%s, %s, %s, %s, %s, %s)"

INSERT2 ="insert into generic_function_cache_v2 (advertiser, url_pattern, udf, zipped, date, action_id) values (%s, %s, %s, %s, %s, %s)"
REPLACE2="replace into generic_function_cache_v2 (advertiser, url_pattern, udf, zipped, date, action_id) values (%s, %s, %s, %s, %s, %s)"

PARAMETERS_FIRST = "select parameters from advertiser_udf_parameter where advertiser = '%(advertiser)s' and filter_id=%(filter_id)s and udf='%(udf)s'"
PARAMETERS_SECOND = "select parameters from advertiser_udf_parameter where advertiser = '%(advertiser)s' and filter_id = %(filter_id)s"
PARAMETERS_THIRD = "select parameters from advertiser_udf_parameter where advertiser = '%(advertiser)s'"


class UDFRunner(BaseRunner):

    def __init__(self, connectors, advertiser, base_url, log_object=False):
        self.connectors =connectors
        self.advertiser = advertiser
        self.crusher = connectors.get('crusher_wrapper',False) or self.get_crusher_obj(advertiser, base_url)
        self.logging = log_object if log_object else logging

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
                self.logging.info("could not read parameters")

        _url = new_URL or URL
        url = _url.format(func_name, pattern, self.action_id)
        self.logging.info(url)
        try:
            resp = self.crusher.get(url, timeout=1200, allow_redirects=False)
        except:
            raise Exception("Failed call to UDF endpoint")

        if resp.status_code == 502:
            import time
            time.sleep(30)
            raise Exception("Response is not 200, response is %s so sleeping for 30 seconds to minimize error contagion") 

        if resp.status_code != 200:
            raise Exception("Response is not 200, response is %s with error %s" % (resp.status_code, resp.text))


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
            self.logging.info(e)
            raise Exception(e)

    def compress(self, data):
        compressed = zlib.compress(data)
        hexify = codecs.getencoder('hex')
        compress_as_hex = hexify(compressed)
        return compress_as_hex[0]

    def insert(self, pattern, func_name, compressed_data, now_date):
        try:
            Q = INSERT
            self.connectors['crushercache'].execute(Q, (self.advertiser, pattern, func_name, compressed_data, now_date, self.action_id))
        except:
            Q = REPLACE
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

def query_overrides(db, query, advertiser, filter_id, udf):
    params = {"advertiser":advertiser, "filter_id":filter_id, "udf":udf}
    result = db.select_dataframe(query % params)
    return result
            
def pull_override_parameters(db, advertiser, filter_id, udf):
    for Q in [PARAMETERS_FIRST , PARAMETERS_SECOND , PARAMETERS_THIRD]:
        override = query_overrides(db, Q, advertiser, filter_id, udf)
        if len(override)>0:
            return override
    return {}

def process_parameters(override_parameters, url_parameters):
    combined_dict = override_parameters
    for k,v in url_parameters.items():
        if k not in combined_dict.keys():
            combined_dict[k] = v
    
    default = {"num_days":2}
    for k,v in default.items():
        if k not in combined_dict.keys():
            combined_dict[k] = v
    return combined_dict

def runner(**kwargs):
    #add other parameters options that can be added on to url request
    connectors = kwargs['connectors']
   
    now_date = datetime.datetime.now().strftime("%Y-%m-%d")
    
    if not kwargs.get('job_id',False):
        uuid_num = "local_"+str(uuid.uuid4())
    else:
        uuid_num = kwargs['job_id']

    base_url = kwargs.get('base_url', "http://beta.crusher.getrockerbox.com")
    UR = UDFRunner(connectors, kwargs['advertiser'], base_url, kwargs['parameters']['log_object'])
    
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
   
    override_parameters = pull_override_parameters(db, kwargs['advertiser'], filter_id, func_name)
    override_parameters = {} if len(override_parameters) ==0 else override_parameters

    parameters = kwargs.get("parameters",False)
    url_parameters = {}
    if parameters:
        for k,v in dict(parameters).items():
            if k not in UDF_EXCLUDES:
                url_parameters[k] = v

    final_url_parameters = process_parameters(override_parameters, url_parameters)

    data = UR.make_request(pattern, func_name, final_url_parameters)
    compress_data = UR.compress(ujson.dumps(data))
    
    UR.insert( pattern, func_name, compress_data, now_date)
    UR.logging.info("Data inserted params advertiser: %s udf: %s filter id: %s date: %s pattern: %s" % (UR.advertiser, func_name, UR.action_id, now_date, pattern))
    UR.accounting_entry_end(UR.advertiser, pattern, func_name, uuid_num, UR.action_id)
