import tornado.web
import ujson
import pandas
import mock
import time
import logging
import json

from base import BaseHandler
from twisted.internet import defer
from lib.helpers import *
from lib import custom_defer
from adwords_helper import AdwordsHelper

INSERT = "insert into adwords_campaign_endpoint (advertiser_id, name, endpoint) values (%s, %s, %s)"

class AdwordsHandler(BaseHandler, AdwordsHelper):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache = crushercache

    @custom_defer.inlineCallbacksErrors
    def pull_endpoints(self, advertiser_id, plan):
        resp = yield self.build_response(advertiser_id, plan)
        self.write( json.dumps(resp) )
        self.finish()

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        plan_type = self.get_argument("plan",False)
        advertiser_id = self.current_advertiser
        self.pull_endpoints(advertiser_id, plan_type)

    def post(self):
        advertiser_id = self.current_advertiser
        post_data = ujson.loads(self.request.body)
        self.crushercache.execute(INSERT, (advertiser_id, post_data['name'], post_data['endpoint']))
        self.write(ujson.dumps({"status":"Success"}))

