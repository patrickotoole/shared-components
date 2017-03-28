import tornado.web
import json
import pandas as pd
import logging
from database import *

class SetupHandler(tornado.web.RequestHandler, SetupDatabase):

    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False) 
        self.crushercache = kwargs.get("crushercache",False)  

    def get(self):
        advertiser_id = self.get_query_argument("advertiser")
        setups = self.get_setup(advertiser_id)
        j = json.dumps(setups.to_dict("records"))
        self.write(j)
        self.finish()

    def post(self):
        advertiser_id = self.get_query_argument("advertiser")
        data = json.loads(self.request.body).get('data')

        for x in data:
            x['external_advertiser_id'] = advertiser_id
        data = pd.DataFrame(data)
        self.insert(data)
        self.get()