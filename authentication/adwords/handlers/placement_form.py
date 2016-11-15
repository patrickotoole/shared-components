import uuid
import ujson
from tornado import web
from adwords import AdWords
import json

class PlacementFormHandler(web.RequestHandler):
    def initialize(self, **kwarg):
        self.db = kwarg.get('db',None)
        self.adwords = kwarg.get('adwords',None)

    # List
    def get(self):
        advertiser_id = int(self.get_secure_cookie('advertiser'))
        adgroup_id = self.get_argument('adgroup_id',0)

        self.render("templates/placementform.html", data={'adgroup_id':adgroup_id})

