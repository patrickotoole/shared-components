import tornado.web
import ujson
import pandas
import StringIO
import logging

from base import BaseHandler
from twisted.internet import defer
from lib.helpers import decorators

class CreativeHandler(BaseHandler):
    def initialize(self, db=None, api=None, **kwargs):
        self.db = db
        self.api = api

    @decorators.deferred
    def defer_get_creatives(self,advertiser_id):
        URL = "/creative?advertiser_id=%s" % advertiser_id
        data = self.api.get(URL)
        return data.json['response']['creatives']

    @defer.inlineCallbacks
    def get_creatives(self,advertiser_id):
        
        creatives = yield self.defer_get_creatives(advertiser_id)
        df = pandas.DataFrame(creatives)
        active = df[df['state'] == 'active']
        del active['segments']
        del active['campaigns']
        del active['line_items']

        creative_list = active.T.to_dict().values()
        self.write(ujson.dumps(creative_list))
        self.finish()

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        self.get_creatives(self.current_advertiser)
