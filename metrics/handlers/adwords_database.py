import tornado.web
import ujson
import pandas
import mock
import time
import logging

from base import BaseHandler
from twisted.internet import defer
from lib.helpers import *

class AdwordsHandler(BaseHandler):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache = crushercache

    def get(self):
        advertiser_id = self.current_advertiser
        data = self.crushercache.select_dataframe("select * from adwords_campaign_endpoint where advertiser_id = %s" % advertiser_id)
        self.write(data.to_json())

    def post(self):
        advertiser_id = self.current_advertiser
        post_data = ujson.loads(self.request.body)
        QUERY = "insert into adwords_campaign_endpoint (advertiser_id, name, endpoint) values (%s, %s, %s)"
        self.crushercache.execute(QUERY, (advertiser_id, post_data['name'], post_data['endpoint']))
        self.write(ujson.dumps({"status":"Success"}))

