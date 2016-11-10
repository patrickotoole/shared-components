import tornado.web
import pandas
import logging

from ...search.pattern.base_visitors import VisitorBase
from lib.helpers import decorators

QUERYFIRST = "select body from user_defined_functions where udf ='{}' and advertiser='{}'"
QUERYFUNCTIONS = "select body from user_defined_functions where udf = '{}' and advertiser is NULL"

def userDefinedFunction(code_string):
    env = {}
    code_string = code_string.replace("import", "raise Exception('user defined function error')")

    code = compile(code_string, '<string>','exec')
    exec code in env
    return env 

class VisitorTransformHandler(VisitorBase):

    def initialize(self, db=None, cassandra=None, zookeeper=None, crushercache=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.zookeeper = zookeeper
        self.crushercache = crushercache
        self.DOMAIN_SELECT = "SELECT uid, domain, timestamp FROM rockerbox.visitor_domains_full where uid = ?"

    def getProcess(self, advertiser, url_pattern, api_type):
        advertiser_overrides = self.crushercache.select_dataframe(QUERYFIRST.format(api_type, advertiser))
        if len(advertiser_overrides)>0:
            user_func = advertiser_overrides['body'][0]
            user_env = userDefinedFunction(user_func)
            process = [user_env[api_type]]
        else:
            names = [x.__name__ for x in self.DEFAULT_FUNCS]
            api_name = "process_{}".format(api_type)
            if api_name not in names:
                user_defined = self.crushercache.select_dataframe(QUERYFUNCTIONS.format(api_type))
                user_func = user_defined['body'][0]
                user_env = userDefinedFunction(user_func)
                process = [user_env[api_type]]
            else:
                process = filter(lambda x: ("process_" + api_type) in x.__name__, self.DEFAULT_FUNCS)
        return process


    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self, api_type):
        advertiser = self.current_advertiser_name
        terms = self.get_argument("url_pattern", False)
        num_days = self.get_argument("num_days", 2)
        preventsample = self.get_argument("prevent_sample",None)
        filter_id = self.get_argument("filter_id",False)
        filter_date = self.get_argument("date", False)
        num_users = self.get_argument("num_users",20000)
        
        try: 
            process = self.getProcess(advertiser, terms, api_type)
        except:
            raise Exception("UDF does not exist")

        DEFAULT_DATASETS = ['domains','domains_full','urls','idf','uid_urls', 'url_to_action', 'category_domains', 'corpus', 'artifacts', 'idf_hour']
        url_arg = self.request.arguments

        if preventsample is not None:
            preventsample = preventsample == 'true'
        logging.info(preventsample)
        self.get_uids(advertiser,[[terms]],int(num_days),process=process, prevent_sample=preventsample, num_users=num_users, datasets=DEFAULT_DATASETS, filter_id=filter_id, date=filter_date, url_args=url_arg)
