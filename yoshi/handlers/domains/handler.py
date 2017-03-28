import tornado.web
import json
import pandas as pd
import random
import logging
from database import *

class DomainsHandler(tornado.web.RequestHandler, DomainsDatabase):
    
    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False)
        self.crusher = kwargs.get("crusher",False)
        self.crushercache = kwargs.get("crushercache",False)

    def get(self):
        advertiser_id = self.get_query_argument("advertiser")
        queue = self.get_domains_queue(advertiser_id)
        self.write(json.dumps(queue.to_dict('records')))
        self.finish()
    
    def post(self):

        advertiser_id = self.get_query_argument("advertiser")
        data = json.loads(self.request.body).get('data')
        data = pd.DataFrame(data)
        data['external_advertiser_id'] = advertiser_id
        self.write_queue(data)
