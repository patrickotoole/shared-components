import uuid
import ujson
from tornado import web
from adwords import AdWords
import json

class CampaignFormHandler(web.RequestHandler):
    def initialize(self, **kwarg):
        self.db = kwarg.get('db',None)
        self.adwords = kwarg.get('adwords',None)

    # List
    def get(self):
        advertiser_id = int(self.get_secure_cookie('advertiser'))
        response = self.adwords.read_campaign(advertiser_id)

        self.render("templates/campaignform.html")

