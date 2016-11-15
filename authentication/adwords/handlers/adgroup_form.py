import uuid
import ujson
from tornado import web
from adwords import AdWords
import json

class AdGroupFormHandler(web.RequestHandler):
    def initialize(self, **kwarg):
        self.db = kwarg.get('db',None)
        self.adwords = kwarg.get('adwords',None)

    # List
    def get(self):
        advertiser_id = int(self.get_secure_cookie('advertiser'))
        campaign_id = self.get_argument('campid',0)

        self.render("templates/adgroupform.html", data={'campid':campaign_id})

