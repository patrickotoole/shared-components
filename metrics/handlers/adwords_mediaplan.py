import tornado.web
import ujson
import pandas
import mock
import time
import logging

from base import BaseHandler
from twisted.internet import defer
from lib.helpers import *

SELECT = "select * from adwords_campaign_endpoint where active=1 and deleted = 0 and advertiser_id = '%s'"
INSERT = "insert into adwords_campaign_endpoint (advertiser_id, name, endpoint) values (%s, %s, %s)"

class AdwordsHandler(BaseHandler):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache = crushercache

    def get(self):
        advertiser_id = self.current_advertiser
        data = self.crushercache.select_dataframe(SELECT % advertiser_id)
        self.write( ujson.dumps({"response":data.to_dict('records')}) )

    def post(self):
        advertiser_id = self.current_advertiser
        post_data = ujson.loads(self.request.body)
        self.crushercache.execute(INSERT, (advertiser_id, post_data['name'], post_data['endpoint']))
        self.write(ujson.dumps({"status":"Success"}))

