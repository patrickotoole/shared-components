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

class FunnelRecsHandler(BaseHandler):
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
    def get_recs(self, advertiser):
        df = yield self.defer_get_recs(advertiser)
        self.get_content(df)

    @decorators.deferred
    def defer_get_recs(self, advertiser):
        excludes = {'_id': False}
        
        if advertiser:
            includes = {"advertiser": advertiser}
        else:
            includes = {}
            
        df = pd.DataFrame(list(self.mongo.rockerbox.funnel_recs.find(includes, excludes)))
        return df

    @tornado.web.asynchronous
    def get(self):
        advertiser = self.get_argument("advertiser", False)
        formatted = self.get_argument("format", False)

        if formatted:
            self.get_recs(advertiser)
        else:
            self.get_content(pandas.DataFrame())
