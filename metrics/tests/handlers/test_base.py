import sys
import mock
import os
sys.path.append("../../")

from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

import unittest
import metrics.handlers.base as base

class LoginTest(AsyncHTTPTestCase):

    def get_app(self):
        self.app = Application([('/', base.BaseHandler)])
        return self.app
  
    def test_get(self):
        response = self.fetch("/")
        self.assertEqual(response.body, "hello")
