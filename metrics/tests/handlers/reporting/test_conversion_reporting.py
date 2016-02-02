import sys
import mock
import os
sys.path.append("../../")


from tornado.testing import AsyncHTTPTestCase
from tornado.web import Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode 
from link import lnk
import logging

import unittest
import ujson
import metrics.handlers.reporting as reporting
import lib.query.MYSQL as MYSQL
ADVERTISER_ID = "306383"
CREATIVE_ID = "14889899"
EXPECTED_KEYS = [
u'conversion_event',
u'conversion_window_hours',
u'conversion_time',
u'conversion_window_days',
u'conversion_type',
u'converter_data',
]

CREATE_CONVERSION = "create table test.conversion_reporting like reporting.v2_conversion_reporting;"
CREATE_PIXEL = "create table test.advertiser_pixel like rockerbox.advertiser_pixel;"

INSERT_CONVERSION = "insert into test.conversion_reporting select * from reporting.v2_conversion_reporting where creative_id = %s limit 10;" % CREATIVE_ID
INSERT_PIXEL = "INSERT INTO test.advertiser_pixel select * from rockerbox.advertiser_pixel where external_advertiser_id = %s" % ADVERTISER_ID

DROP_CONVERSION = "drop table test.conversion_reporting;"
DROP_PIXEL = "drop table test.advertiser_pixel;" 

DROP_CHECK_CONV = "drop table if exists test.conversion_reporting"
DROP_CHECK_PIXEL = "drop table if exists test.advertiser_pixel"

class CreativeReportingTest(AsyncHTTPTestCase):
    
    def get_app(self):
        
        self.db = lnk.dbs.test
        self.db.execute(DROP_CHECK_CONV)
        self.db.execute(DROP_CHECK_PIXEL)
        
        self.db.execute(CREATE_CONVERSION)
        self.db.execute(CREATE_PIXEL)
        self.db.execute(INSERT_CONVERSION)
        self.db.execute(INSERT_PIXEL)

        dirname = os.path.dirname(os.path.realpath(__file__)) + "../../../../templates"
        self.app = Application([('/', reporting.ConversionReportingHandler, dict(db=self.db))],
            cookie_secret="rickotoole",
            template_path=dirname
        )
        reporting.ConversionReportingHandler.get_current_user = mock.Mock()
        reporting.ConversionReportingHandler.get_current_advertiser = mock.Mock() 
        reporting.ConversionReportingHandler.get_current_advertiser.return_value = ADVERTISER_ID
        return self.app
         
    def tearDown(self):
        self.db.execute(DROP_CONVERSION)
        self.db.execute(DROP_PIXEL)

    def test_get_conversion_page(self):
        response = self.fetch("/").body
        self.assertIn(ADVERTISER_ID, response)

    def test_get_advertiser_json(self):
        response = self.fetch("?format=json").body

        as_json = ujson.loads(response)
        first_element = as_json[0]

        self.assertTrue(len(as_json) > 0)
        self.assertEqual(set(first_element.keys()),set(EXPECTED_KEYS))

 
