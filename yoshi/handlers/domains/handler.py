import tornado.web
import json
import pandas as pd
import logging
from database import *
from lib.helpers import decorators
from lib import custom_defer
from handlers.base import *
from deferred import *


class DomainsHandler(BaseHandler, DomainsDeferred):
    
    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False)
        self.crusher = kwargs.get("crusher",False)
        self.crushercache = kwargs.get("crushercache",False)


    @custom_defer.inlineCallbacksErrors
    def load_domains_queue(self, advertiser_id):
        queue =  yield self.get_domains_queue_deferred(advertiser_id)
        self.write(json.dumps(queue.to_dict('records')))
        self.finish()

    
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        advertiser_id = self.get_query_argument("advertiser")
        self.load_domains_queue(advertiser_id)
    
