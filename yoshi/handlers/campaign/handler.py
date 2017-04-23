import tornado.web
import json
import pandas as pd
import logging
from api import *
from lib.helpers import decorators
from lib import custom_defer



class CampaignHandler(tornado.web.RequestHandler, CampaignAPI):

    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False)
        self.crusher = kwargs.get("crusher",False)
        self.crushercache = kwargs.get("crushercache",False)


    @custom_defer.inlineCallbacksErrors
    def load_domains_to_create(self, advertiser_id):
        domains = yield self.get_domains_to_create(advertiser_id)
        self.render("create.html", domains = json.dumps(domains.to_dict('records')))


    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        advertiser_id = self.get_query_argument("advertiser")
        self.load_domains_to_create(advertiser_id)


    def post(self):
        advertiser_id = self.get_query_argument("advertiser")
        data = json.loads(self.request.body)
        self.run_campaign_creation(advertiser_id, data)

