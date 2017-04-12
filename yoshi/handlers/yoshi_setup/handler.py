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
        line_items = self.get_line_items(advertiser_id)
        media_plans = self.get_media_plans(advertiser_id)
        data = {
            'setup': setups.to_dict('records'),
            'line_items': line_items['line_item_name'].tolist(),
            'media_plans': media_plans['name'].tolist()

        }
        self.render("setup.html", data = json.dumps(data))
        # self.finish()

    def post(self):
        advertiser_id = self.get_query_argument("advertiser")
        data = json.loads(self.request.body)
        for x in data:
            x['external_advertiser_id'] = advertiser_id
        data = pd.DataFrame(data)
        self.insert(data)
        self.get()