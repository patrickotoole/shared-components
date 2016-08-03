import tornado.web
import ujson
import lib.custom_defer as custom_defer

from twisted.internet import defer
from lib.helpers import *
from base import BaseHandler

import mocks.cassandra
from datetime import datetime, timedelta

class RedirectHandler(BaseHandler):

    def initialize(self, db=None, **kwargs):
        self.db = db
        
    @decorators.deferred
    def status(self):
        what_to_write = '0'
        return what_to_write

    @custom_defer.inlineCallbacksErrors
    def run_check(self):
        what_to_write = yield self.status()
        self.set_status(300)
        self.write(what_to_write)
        self.finish()

    @tornado.web.asynchronous
    def get(self,meta=""):
        if "check" in meta:
            self.run_check()
        else:
            self.redirect('/')
