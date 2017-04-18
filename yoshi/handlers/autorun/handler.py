import tornado.web
import json
import pandas as pd
import logging
from database import *


class AutorunHandler(tornado.web.RequestHandler, AutorunDatabase):

    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False) 

    def get(self):
        advertiser_list = self.get_advertisers()
        advertiser_id = self.get_query_argument("advertiser", default = False)
        
        if advertiser_id:
            next = advertiser_list.index(int(advertiser_id)) + 1
        else:
            next = 0

        if next < len(advertiser_list):
            next_advertiser = advertiser_list[next]
            logging.info("Auto-Running for %s"%next_advertiser) 
            self.redirect("/create?advertiser=%s&run_all=true&force_run=true"%next_advertiser)
        else:
            logging.info("Finished auto-runs")
