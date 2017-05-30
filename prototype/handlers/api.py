import tornado.web
import ujson
import pandas

from base import BaseHandler
from api_helper import *
import custom_defer

class ApiHandler(BaseHandler, ApiHelper):

    def initialize(self, **kwargs):
        self.prototype = kwargs['prototype']
        self.db = kwargs['db']

    @custom_defer.inlineCallbacksErrors
    def pull_and_result(self, domain_filter, filter_id):
        data = yield self.database_query(domain_filter, filter_id)
        self.write(ujson.dumps(data))
        self.finish()

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self,*args):
        domain_filter = self.get_argument("domain",False)
        filter_id = self.get_argument("filter_id",False)
        self.pull_and_result(domain_filter, filter_id)

