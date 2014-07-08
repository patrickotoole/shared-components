import sys
import mock
sys.path.append("../../")

import ujson
from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

import unittest
import metrics.handlers.user as user

class SignupTest(AsyncHTTPTestCase):

    def get_app(self):
        self.db = lnk.dbs.mysql
        self.app = Application([('/', user.SignupHandler, dict(db=self.db))],cookie_secret="rickotoole")
        return self.app

    def tearDown(self):
        self.db.execute("delete from user where username = 'test' ")
        self.db.commit()

    @classmethod
    def setUpClass(self):
        self.new_user = {
            "username":"test",
            "password":"test",
            "advertiser":1
        }
        self.missing = {
            "username": "test"
        }
  
    def test_signup(self):
        with mock.patch.object(user.SignupHandler, "get_secure_cookie") as m:
            m.return_value = False
            response = self.fetch('/',method="GET")
        self.assertTrue("signup" in to_unicode(response.body))

    def test_signed_in(self):
        with mock.patch.object(user.SignupHandler, "get_secure_cookie") as m:
            m.return_value = "something"
            response = self.fetch('/',method="GET")
        self.assertTrue("already" in to_unicode(response.body))

    def test_signup_success(self):
        body = ujson.dumps(self.new_user)
        response = self.fetch('/',method="POST",body=body)
        self.assertTrue("success" in to_unicode(response.body))

        headers = {}
        headers['Cookie'] = response.headers['Set-Cookie']

        response_get = self.fetch('/',headers=headers)
        self.assertTrue("already" in to_unicode(response_get.body))
        
    def test_signup_failure_blank(self):
        response = self.fetch('/',method="POST",body="")
        self.assertTrue("failure" in to_unicode(response.body))

    def test_signup_failure_missing(self):
        body = ujson.dumps(self.missing)
        response = self.fetch('/',method="POST",body=body)
        self.assertTrue("failure" in to_unicode(response.body))

    def test_signup_failure_duplicate(self):
        body = ujson.dumps(self.new_user)
        response = self.fetch('/',method="POST",body=body)
        self.assertTrue("success" in to_unicode(response.body))

        response = self.fetch('/',method="POST",body=body)
        self.assertTrue("failure" in to_unicode(response.body))


