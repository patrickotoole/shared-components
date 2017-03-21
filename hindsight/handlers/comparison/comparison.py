import tornado.web
import ujson
import pandas

from handlers.base import BaseHandler

class ComparisonHandler(BaseHandler):

    def initialize(self, db=None, **kwargs):
        self.db = db

    @tornado.web.authenticated
    def get(self,*args):
        self.render("analysis/comparison.html",data="{}", advertiser=self.current_advertiser_name)

