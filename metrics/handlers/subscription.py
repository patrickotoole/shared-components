import tornado.web
import logging
import sys
import ujson

from lib.helpers import *
from base import BaseHandler
from twisted.internet import defer


class SubscriptionDatabase:

    def time_string(self):
        datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    @decorators.deferred
    def save_token(self,user_id,token):
        Q = """
            INSERT INTO user_stripe_token 
                (user_id,stripe_token,last_activity) VALUES (%s,%s,'%s') 
            ON DUPLICATE KEY UPDATE 
                stripe_token = VALUES(stripe_token) and last_activity = VALUES(last_activity)
        """
        self.db.execute(Q % (user_id,token,self.time_string()))
        return token
        
        

        

class SubscriptionHandler(BaseHandler,SubscriptionDatabase):

    def initialize(self,db=None):
        self.db = db

    @tornado.web.authenticated
    @defer.inlineCallbacks
    def post(self):

        import ipdb; ipdb.set_trace() 

        self.request
        
        ujson.loads(self.request.body)

        user_id = self.current_user
        token = yield self.save_token(user_id,token)
        self.redirect("/crusher/settings/subscription")

