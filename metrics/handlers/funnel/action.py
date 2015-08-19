import tornado.web
import ujson
import pandas

from handlers.base import BaseHandler
from lib.helpers import Convert

from action_auth import ActionAuth
from action_database import ActionDatabase
from ..api_helpers import APIHelpers

 
class ActionHandler(BaseHandler,ActionAuth,APIHelpers,ActionDatabase):

    def initialize(self, db=None, **kwargs):
        self.db = db 
        self.required_cols = ["advertiser", "action_name", "operator"]
    

    @tornado.web.authenticated
    def delete(self):
        try:
            data = self.perform_delete()
            self.write_response(data)
        except Exception, e:
            self.write_response(str(e),"ERR")

    @tornado.web.authenticated
    def post(self):
        try:
            data = self.perform_insert(self.request.body)
            self.write_response(data)
        except Exception, e:
            self.write_response(str(e),"ERR")

    @tornado.web.authenticated
    def put(self):
        try:
            data = self.perform_update(self.request.body)
            self.write_response(data)
        except Exception, e:
            self.write_response(str(e),"ERR")

    @tornado.web.authenticated
    def get(self):
        advertiser = self.get_argument("advertiser", self.current_advertiser_name)
        action_id = self.get_argument("action_id",False)

        if action_id:
            results = self.get_advertiser_action(advertiser,action_id)
        else:
            results = self.get_advertiser_actions(advertiser)

        self.write_response(Convert.df_to_values(results))
