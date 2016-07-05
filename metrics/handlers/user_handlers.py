import tornado.web
import logging
import sys
import ujson
from lib.helpers import *
from base import BaseHandler
import lib.password_hash as password_hash

from login.handler import LoginHandler
from permissions.handler import AccountPermissionsHandler
from user.handler import UserHandler

SignupHandler = UserHandler

pw_hash = password_hash.PasswordHash()

from base import BaseHandler

class LoginAdvertiserHandler(BaseHandler):

    def initialize(self,db=None):
        self.db = db

    @tornado.web.authenticated
    def post(self):

        user = self.current_user
        body = ujson.loads(self.request.body)
        advertiser_id = body["access_code"]
        df = self.db.select_dataframe("SELECT * FROM advertiser where external_advertiser_id = %s" % advertiser_id)

        if len(df):
            self.set_secure_cookie("advertiser",advertiser_id)
            self.db.execute("UPDATE user set advertiser_id = %s where username = '%s'" % (advertiser_id,user))
            self.write("success")
        self.finish()
   

    def get(self):
        self.render("_make_advertiser.html")


