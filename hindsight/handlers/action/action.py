import tornado.web
import ujson
import pandas
import requests

from handlers.base import BaseHandler
from lib.helpers import Convert

from action_auth import ActionAuth
from action_database import ActionDatabase
from lib.helpers import APIHelpers
from link import lnk

class ActionHandler(BaseHandler,ActionAuth,APIHelpers,ActionDatabase):

    def initialize(self, db=None, zookeeper=None, **kwargs):
        self.db = db
        self.zookeeper = zookeeper
        self.crushercache = kwargs.get('crushercache',None)
        self.required_cols = ["advertiser", "action_name"]
        self.requests = requests
        self.tree_sync = kwargs.get('tree_sync', None)


    @tornado.web.authenticated
    def delete(self):
        try:
            data = self.perform_delete(self.zookeeper)
            self.write_response(data)
        except Exception, e:
            self.write_response(str(e),e)

    @tornado.web.authenticated
    def post(self):
        try:
            advertiser = self.current_advertiser_name
            actions = self.get_advertiser_actions(advertiser)
            body = ujson.loads(self.request.body)
            body['featured'] = 0

            if not len(actions):
                body['featured'] = 1

            self.request.body = ujson.dumps(body)
            data = self.perform_insert(self.request.body, self.zookeeper)

            self.write_response(data)
        except Exception, e:
            self.write_response(str(e),e)

    @tornado.web.authenticated
    def put(self):
        try:
            data = self.perform_update(self.request.body, self.zookeeper)
            self.write_response(data)
        except Exception, e:
            self.write_response(str(e),e)

    @tornado.web.authenticated
    def get(self):
        advertiser = self.get_argument("advertiser", self.current_advertiser_name)
        action_id = self.get_argument("id",False)

        try:
            if action_id:
                results = self.get_advertiser_action(advertiser,action_id)
            else:
                results = self.get_advertiser_actions(advertiser)
            self.write_response(Convert.df_to_values(results))
        except Exception, e:
            self.write_response(str(e),e)
