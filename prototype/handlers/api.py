import tornado.web
import ujson
import pandas

from base import BaseHandler
from api_helper import *
import custom_defer

class ApiHandler(BaseHandler, ApiHelper):

    def initialize(self, **kwargs):
        self.prototype = kwargs['prototype']
        self.crushercache = kwargs['crushercache']
        self.rockerboxidf = kwargs['rockerboxidf']
        self.db = kwargs['db']
        self._env = {}
        self.build_env()

    def build_env(self):
        compiled_code = compile("import logging", '<string>', 'exec')
        exec compiled_code in self._env

    @custom_defer.inlineCallbacksErrors
    def pull_and_result(self, domain_filter, filter_id,api_udf, advertiser, size, page):
        data = yield self.domain_query(domain_filter, filter_id, api_udf, advertiser, size, page)
        if data is not None:
            self.write(ujson.dumps(data))
            self.finish()

    @custom_defer.inlineCallbacksErrors
    def pull_keyword(self, keyword, filter_id, api_udf, advertiser, size, page):
        data = yield self.keyword_query(keyword, filter_id, api_udf, advertiser, size, page)
        if data is not None:
            self.write(ujson.dumps(data))
            self.finish()



    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self,api_udf):
        domain_filter = self.get_argument("domain",False)
        filter_id = self.get_argument("filter_id",False)
        keyword = self.get_argument("keyword", False)
        filter_limit = self.get_argument("size", 25000)
        page = self.get_argument("offset", False)
        try:
            filter_limit = int(filter_limit)
        except:
            self.set_status(400)
            self.write(ujson.dumps({"error":"size must be a valid integer"}))
            self.finish()
        if not filter_id:
            self.set_status(400)
            self.write(ujson.dumps({"error":"filter_id is a required field"}))
            self.finish()
        if keyword:
            self.pull_keyword(keyword, filter_id, api_udf, self.current_advertiser_name, filter_limit, page)
        else:
            self.pull_and_result(domain_filter, filter_id, api_udf, self.current_advertiser_name, filter_limit, page)

