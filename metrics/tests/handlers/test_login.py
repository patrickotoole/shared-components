import sys
import mock
import os
sys.path.append("../../")

from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

import unittest
import metrics.handlers.user as user

class LoginTest(AsyncHTTPTestCase):

    def get_app(self):
        db = lnk.dbs.mysql
        dirname = os.path.dirname(os.path.realpath(__file__)) + "../../../templates"

        self.app = Application([('/', user.LoginHandler, dict(db=db))],
            cookie_secret="rickotoole",
            template_path= dirname
        )
        return self.app
  
    def test_not_logged_in(self):
        with mock.patch.object(user.LoginHandler, "get_secure_cookie") as m:
            m.return_value = False
            response = self.fetch('/',method="GET")
        self.assertTrue("sign in" in to_unicode(response.body))

    def test_logged_in(self):
        with mock.patch.object(user.LoginHandler, "get_secure_cookie") as m:
            m.return_value = 'user_email'
            response = self.fetch('/', method='GET')
        self.assertTrue("logged in" in to_unicode(response.body))

    def test_login_success(self):
        logged_in = self.fetch('/',method="POST",body="""{"username":"bauble@baublebar.com"}""")
        headers = {}
        headers['Cookie'] = logged_in.headers['Set-Cookie']
        response = self.fetch('/',headers=headers)
        self.assertTrue("logged in" in to_unicode(response.body))

    def test_login_failure(self):
        logged_in = self.fetch('/',method="POST",body="""{"username":"bad"}""")
        self.assertTrue("0" in to_unicode(logged_in.body))



