import sys
import mock
import os
sys.path.append("../../")


from tornado.testing import AsyncHTTPTestCase
from tornado.web import Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode 
from link import lnk

import unittest
import ujson
import metrics.handlers.reporting as reporting
ADVERTISER_ID = "312933"
EXPECTED_KEYS = [u'imps', u'last_served', u'associated_campaigns', u'url', u'creative_id', u'sum(conversions)', u'first_served', u'clicks']

class CreativeReportingTest(AsyncHTTPTestCase):
    
    def get_app(self):
        db = lnk.dbs.test
        dirname = os.path.dirname(os.path.realpath(__file__)) + "../../../../templates"
        self.app = Application([('/', reporting.CreativeReportingHandler, dict(db=db))],
            cookie_secret="rickotoole",
            template_path=dirname
        )
        reporting.CreativeReportingHandler.get_current_user = mock.Mock()
        reporting.CreativeReportingHandler.get_current_advertiser = mock.Mock() 
        reporting.CreativeReportingHandler.get_current_advertiser.return_value = ADVERTISER_ID
        return self.app

    def test_get_advertiser_creative_page(self):
        response = self.fetch("/").body
        self.assertIn(ADVERTISER_ID, response)

    def test_get_advertiser_json(self):
        response = self.fetch("?format=json").body
        as_json = ujson.loads(response)
        first_element = as_json[0]

        self.assertTrue(len(as_json) > 0)
        self.assertEqual(first_element.keys(),EXPECTED_KEYS)


