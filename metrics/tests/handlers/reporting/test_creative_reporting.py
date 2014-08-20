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
import lib.query.MYSQL as MYSQL
ADVERTISER_ID = "306383"
CREATIVE_ID = "14889899"
EXPECTED_KEYS = [u'imps', u'last_served', u'associated_campaigns', u'url', u'creative_id', u'conversions', u'first_served', u'clicks', u'width', u'height']

CREATE_REPORTING = "create table test.v3_reporting like appnexus_reporting.v3_reporting;"
CREATE_CONVERSION = "create table test.conversion_reporting like appnexus_reporting.conversion_reporting;"
CREATE_ATTRIBUTE = "create table test.creative like appnexus_reporting.creative;" 

INSERT_REPORTING = "insert into test.v3_reporting select * from appnexus_reporting.v3_reporting where external_advertiser_id = %s limit 10;" % ADVERTISER_ID
INSERT_CONVERSION = "insert into test.conversion_reporting select * from appnexus_reporting.conversion_reporting where creative_id = %s limit 10;" % CREATIVE_ID
INSERT_ATTRIBUTE = "insert into test.creative select * from appnexus_reporting.creative where external_id = %s limit 10;" % CREATIVE_ID 

DROP_REPORTING = "drop table test.conversion_reporting;" 
DROP_CONVERSION = "drop table test.v3_reporting;"
DROP_ATTRIBUTE = "drop table test.creative;"

class CreativeReportingTest(AsyncHTTPTestCase):
    
    def get_app(self):
        self.db = lnk.dbs.test
        self.db.execute(CREATE_REPORTING)
        self.db.execute(CREATE_CONVERSION)
        self.db.execute(CREATE_ATTRIBUTE) 

        self.db.execute(INSERT_REPORTING)
        self.db.execute(INSERT_CONVERSION)
        self.db.execute(INSERT_ATTRIBUTE)

        dirname = os.path.dirname(os.path.realpath(__file__)) + "../../../../templates"
        self.app = Application([('/', reporting.CreativeReportingHandler, dict(db=self.db))],
            cookie_secret="rickotoole",
            template_path=dirname
        )
        reporting.CreativeReportingHandler.get_current_user = mock.Mock()
        reporting.CreativeReportingHandler.get_current_advertiser = mock.Mock() 
        reporting.CreativeReportingHandler.get_current_advertiser.return_value = ADVERTISER_ID
        return self.app
         
    def tearDown(self):
        self.db.execute(DROP_REPORTING)
        self.db.execute(DROP_CONVERSION)
        self.db.execute(DROP_ATTRIBUTE)

    def test_get_advertiser_creative_page(self):
        response = self.fetch("/").body
        self.assertIn(ADVERTISER_ID, response)

    def test_get_advertiser_json(self):
        response = self.fetch("?format=json").body

        as_json = ujson.loads(response)
        first_element = as_json[0]

        self.assertTrue(len(as_json) > 0)
        self.assertEqual(set(first_element.keys()),set(EXPECTED_KEYS))


