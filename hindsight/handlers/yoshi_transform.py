import tornado.web
import json
import pandas as pd
import logging
from lib.helpers import decorators 
from lib import custom_defer
from handlers.base import *
from transform_helper import *

class TransformHandler(BaseHandler,TransformHelper):
    
    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False)
        self.crusher = kwargs.get("crusher",False)
        self.crushercache = kwargs.get("crushercache",False)


    @custom_defer.inlineCallbacksErrors
    def endpoint_transforms(self, advertiser):
        built_resp =  yield self.build_response(advertiser)
        self.write(json.dumps(built_resp))
        self.finish()

    
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        advertiser_id = self.current_advertiser
        self.endpoint_transforms(advertiser_id)
