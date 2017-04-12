import tornado.web
import json
import pandas as pd
import logging
from database import *



class CampaignHandler(tornado.web.RequestHandler, CampaignDatabase):

    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False)
        self.crusher = kwargs.get("crusher",False)
        self.crushercache = kwargs.get("crushercache",False)


    def get(self):
        advertiser_id = self.get_query_argument("advertiser")
        domains = self.get_domains(advertiser_id)
        self.render("create.html", domains = json.dumps(domains.to_dict('records')))


    def post(self):
        advertiser_id = self.get_query_argument("advertiser")
        data = json.loads(self.request.body)
        self.run_campaign_creation(advertiser_id, data)

