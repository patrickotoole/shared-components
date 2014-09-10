import sys
import mock
import os
sys.path.append("../../../")

from tornado.testing import AsyncHTTPTestCase
from tornado.web import Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode 
from link import lnk
from pandas.util.testing import assert_frame_equal
from pandas import DataFrame

import unittest
import ujson
import metrics.handlers.admin.reporting as reporting

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

CREATE_DASH = "create table test.daily_dash like appnexus_reporting.daily_dash;"
INSERT_DASH = """
INSERT INTO test.daily_dash 
    (
        `date_range`,`external_advertiser_id`,`domain`,
        `avail_imps`, `seen_imps`,`served_imps`,`visible_imps`,`conversions`,
        `spent`,`cpm`,`cpvm`,`percent_visible`,`percent_delivery`
    ) 
VALUES 
    (
        "%(range)s",%(advertiser_id)s, "ebay.com",
        10, 10, 10, 10, 10,
        1, 1, 1, 1, 1
    ),
    (
        "%(range)s",%(advertiser_id)s, "aol.com",
        10, 10, 10, 10, 10,
        1, 1, 1, 1, 1
    ),
    (
        "%(range)s",%(advertiser_id)s, "yahoo.com",
        10, 10, 10, 10, 10,
        1, 1, 1, 1, 1
    )
  
""" 
DROP_DASH = "drop table test.daily_dash;"


class CreativeReportingTest(AsyncHTTPTestCase):
    
    def get_app(self):
        self.db = lnk.dbs.test
        self.db.execute(CREATE_DASH)
        #print INSERT_DASH % {"range":"yesterday","advertiser_id":ADVERTISER_ID}
        self.db.execute(INSERT_DASH % {"range":"yesterday","advertiser_id":ADVERTISER_ID})
        self.db.execute(INSERT_DASH % {"range":"past_week","advertiser_id":ADVERTISER_ID}) 
        self.db.execute(INSERT_DASH % {"range":"past_month","advertiser_id":ADVERTISER_ID})  

        dirname = os.path.dirname(os.path.realpath(__file__)) + "../../../../../templates"
        self.app = Application([('/', reporting.AdvertiserReportingHandler, dict(db=self.db))],
            cookie_secret="rickotoole",
            template_path=dirname
        )
        return self.app
         
    def tearDown(self):
        self.db.execute(DROP_DASH)

    def test_api_get_dash(self):
        response = self.fetch("/?format=json").body
        obj = ujson.loads(response)
        self.assertEqual(len(obj), 3)
        
    def test_api_default_params(self):
        default = ujson.loads(self.fetch("/?format=json").body)
        paramd = ujson.loads(self.fetch("?date_range=yesterday&format=json").body)

        default_df = DataFrame(default)
        new_df = DataFrame(paramd)

        assert_frame_equal(default_df,new_df) 

    def test_api_date_range(self):
        paramd = ujson.loads(self.fetch("?date_range=past_week&format=json").body)
        df = DataFrame(paramd)

        self.assertEqual(sum(df.date_range == "past_week"),3)


    


    
