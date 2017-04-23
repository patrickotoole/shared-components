import tornado.web
import json
import pandas as pd
import logging
from deferred import *
from lib.helpers import decorators
from lib import custom_defer
from handlers.base import *


class SetupHandler(BaseHandler, SetupDeferred):

    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False) 
        self.crushercache = kwargs.get("crushercache",False)

    
    @custom_defer.inlineCallbacksErrors
    def load_setup(self, advertiser_id):
        data = yield self.get_setup_data(advertiser_id)
        self.render("setup.html", data = json.dumps(data))


    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        advertiser_id = self.get_query_argument("advertiser")
        self.load_setup(advertiser_id)

    def post(self):
        advertiser_id = self.get_query_argument("advertiser")
        data = json.loads(self.request.body)
        for x in data:
            x['external_advertiser_id'] = advertiser_id
        data = pd.DataFrame(data)
        self.insert(data)
        self.get()