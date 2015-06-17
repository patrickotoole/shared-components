import tornado.web
import ujson
import pandas
import StringIO
import logging
import time

import pandas as pd

from ..base import BaseHandler
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

class FunnelCampaignsHandler(BaseHandler):
    def initialize(self, mongo=None, **kwargs):
        self.mongo = mongo

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            self.write(data)
        yield default, (data,)

    def write_response(self, response):
        print response
        self.write(response)
        self.finish()

    @defer.inlineCallbacks
    def get_docs(self, funnel_id):
        df = yield self.defer_get_docs(funnel_id)
        self.get_content(df)

    @decorators.deferred
    def defer_get_docs(self, funnel_id):
        excludes = {'_id': False}
        
        if funnel_id:
            includes = {"funnel_id": int(funnel_id)}
        else:
            includes = {}
            
        df = pd.DataFrame(list(self.mongo.rockerbox.funnel_campaigns.find(includes, excludes)))
        return df

    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        funnel_id = self.get_argument("id", False)

        if formatted:
            self.get_docs(funnel_id)
        else:
            self.get_content(pandas.DataFrame())
