import tornado.web
import pandas
import logging

from ...search.pattern.base_visitors import VisitorBase
from lib.helpers import decorators

QUERYFUNCTIONS = "select body from user_defined_functions where udf = '{}'"

def userDefinedFunction(code_string):
    
    env = {}
    code_string.replace("import", "raise Exception('user defined function error')")
    code = compile(code_string, '<string>','exec')
    exec code in env
    #if fnc_name not in locals() and fnc_name not in globals():
    #code_string.replace("import", "raise Exception('user defined function error')")
    #for k in locals().keys():
    #code_string.replace(k, "raise Exception('user defined function error')")
    #for k in globals().keys():
    #code_string.replace(k, "raise Exception('user defined function error')")
    return env 

class VisitorTransformHandler(VisitorBase):

    def initialize(self, db=None, cassandra=None, zookeeper=None, crushercache=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.zookeeper = zookeeper
        self.crushercache = crushercache
        self.DOMAIN_SELECT = "SELECT uid, domain, timestamp FROM rockerbox.visitor_domains_full where uid = ?"



    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self, api_type):
        advertiser = self.current_advertiser_name
        terms = self.get_argument("url_pattern", False)
        import ipdb; ipdb.set_trace()
        names = [x.__name__ for x in self.DEFAULT_FUNCS]
        api_name = "process_{}".format(api_type)
        if api_name not in names:
            user_defined = self.crushercache.select_dataframe(QUERYFUNCTIONS.format(api_type))
            if len(user_defined)==0:
                process = None
            else:
                user_func = user_defined['body'][0]
                user_env = userDefinedFunction(user_func)
                process = [user_env[api_type]]
        else:
            process = filter(lambda x: ("process_" + api_type) in x.__name__, self.DEFAULT_FUNCS)

        if process !=None:
            self.get_uids(advertiser,[[terms]],20,process=process)
        else:
            self.get_uids(advertiser,[[terms]],20,process=[])
