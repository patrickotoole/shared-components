import tornado.web
import ujson
import pandas

from base import BaseHandler

class TestHandler(BaseHandler):

    def initialize(self, db=None, api=None, **kwargs):
        self.db = db
        self.api = api

    @tornado.web.authenticated
    def get(self,*args):
        self.write(ujson.dumps({"value":"test"}))
        self.finish()

