import tornado.web
import pandas
import logging

from ...search.pattern.base_visitors import VisitorBase
from lib.helpers import decorators

QUERYFUNCTIONS = "select function from user_defined_functions where function_name = '{}'"

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

        names = [x.__name__ for x in self.DEFAULT_FUNCS]
        api_name = "process_{}".format(api_type)
        if api_name not in names:
            user_defined = self.crushercache.select_dataframe(QUERYFUNCTIONS.format(api_type))
            user_func = user_defined['function'][1]
            #exec(user_func)
            #process = 
            _resp = {"Where is it": "Coming Soon"}
            import json
            self.write(json.dumps(_resp))
            self.finish()
        else:
            process = filter(lambda x: ("process_" + api_type) in x.__name__, self.DEFAULT_FUNCS)

        if len(process):
            self.get_uids(advertiser,[[terms]],20,process=process)
        else:
            self.get_uids(advertiser,[[terms]],20,process=[])
