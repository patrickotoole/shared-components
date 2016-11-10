import ujson
from tornado import web
from adwords import AdWords
import json

class CustomerHandler(web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db',None)
        self.adwords = kwargs.get('adwords',None)

    def get(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        response = self.adwords.get_customer(int(advertiser_id))

        self.write(response)
