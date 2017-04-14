import tornado.web
import ujson
import pandas

from handlers.base import BaseHandler

class ActionIndexHandler(BaseHandler):

    def initialize(self, db=None, api=None, **kwargs):
        self.db = db
        self.api = api

    @tornado.web.authenticated
    def get(self,*args):
        self.render("analysis/action.html",data="{}", advertiser=self.current_advertiser_name)

