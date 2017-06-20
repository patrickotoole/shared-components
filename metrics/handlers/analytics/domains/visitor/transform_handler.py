import tornado.web
import pandas
import logging

import lib.execution.build
import lib.custom_defer as custom_defer
from lib.helpers import decorators

from ...search.pattern.base_visitors import VisitorBase
from lib.helpers import decorators

QUERYFIRST = "select body from user_defined_functions where udf ='{}' and advertiser='{}'"
QUERYFUNCTIONS = "select body from user_defined_functions where udf = '{}' and advertiser is NULL"

def userDefinedFunction(code_string,env):
    code_string = code_string.replace("import ", "raise Exception('user defined function error')")
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

    def buildEnvironment(self):
        return lib.execution.build.build_execution_env_from_db(self.crushercache)
 
    @decorators.deferred
    def get_process(self, advertiser, url_pattern, api_type):
        advertiser_overrides = self.crushercache.select_dataframe(QUERYFIRST.format(api_type, advertiser))
        user_defined = self.crushercache.select_dataframe(QUERYFUNCTIONS.format(api_type))
        is_default = filter(lambda x: ("process_" + api_type) in x.__name__, self.DEFAULT_FUNCS)

        env = self.buildEnvironment().env()
        exec "import logging" in env


        if len(advertiser_overrides) > 0:
            user_func = advertiser_overrides['body'][0]
            user_env = userDefinedFunction(user_func,env)
            return [user_env[api_type]]

        if len(user_defined) > 0:
            user_func = user_defined['body'][0]
            user_env = userDefinedFunction(user_func,env)
            return [user_env[api_type]]

        return is_default

    @custom_defer.inlineCallbacksErrors
    def run_udf(self,api_type):
        advertiser = self.current_advertiser_name
        terms = self.get_argument("url_pattern", False)
        num_days = self.get_argument("num_days", 2)
        preventsample = self.get_argument("prevent_sample",None)
        filter_id = self.get_argument("filter_id",False)
        filter_date = self.get_argument("date", False)
        num_users = self.get_argument("num_users",20000)
        skip_datasets = self.get_argument("skip_datasets","").split(",")
        use_served = self.get_argument("served",False)
        campaign_id = self.get_argument("campaign_id",False)

        include_datasets = [x for x in self.get_argument("include_datasets","").split(",") if len(x)>1]

        process = yield self.get_process(advertiser, terms, api_type)
        DEFAULT_DATASETS = ['domains','domains_full','urls','idf','uid_urls', 'url_to_action', 'category_domains', 'corpus', 'artifacts', 'idf_hour', 'actions']
        all_datasets = DEFAULT_DATASETS + include_datasets

        datasets = [d for d in all_datasets if d not in skip_datasets]

        url_arg = self.request.arguments
        if use_served: 
            use_served = True

        if preventsample is not None:
            preventsample = preventsample == 'true'
        logging.info(preventsample)
        self.get_uids(advertiser,[[terms]],int(num_days),process=process, prevent_sample=preventsample, num_users=num_users, datasets=datasets, filter_id=filter_id, date=filter_date, url_args=url_arg, l1_flag=use_served, campaign_id=campaign_id)

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self, api_type):

        self.run_udf(api_type)

