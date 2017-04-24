import sys
import os
import ujson
import mock

from tornado.testing import AsyncHTTPTestCase, gen_test, get_async_test_timeout
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

import unittest
from lib.helpers import *

import advertiser_data

CREATE_ADVERTISER_TABLE="""
CREATE TABLE if not exists `advertiser_caching` (
  `pixel_source_name` varchar(250) DEFAULT NULL,
  `valid_pixel_fires_yesterday` tinyint(1) DEFAULT '0',
  `skip` tinyint(1) DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `job_id` varchar(250) DEFAULT NULL,
  UNIQUE KEY `unique_advertiser` (`pixel_source_name`)
)
"""

CREATE_SEGMENT_TABLE="""
CREATE TABLE if not exists `advertiser_caching_segment` (
  `pixel_source_name` varchar(250) DEFAULT NULL,
  `filter_id` int(12) DEFAULT NULL,
  `action_name` varchar(250) DEFAULT NULL,
  `pattern` varchar(250) DEFAULT NULL,
  `data_populated` tinyint(1) DEFAULT '0',
  `skip` tinyint(1) DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `job_id` varchar(250) DEFAULT NULL
)
"""
DROP_ADVERTISER = "drop table advertiser_caching"
DROP_SEGMENT = "drop table advertiser_caching_segment"

FIXTURE1 = "insert into advertiser_caching (pixel_source_name, valid_pixel_fires_yesterday, skip, job_id) values ('fsastore', 1,0,'test123')"

FIXTURE2 = "insert into advertiser_caching_segment (pixel_source_name, filter_id, action_name, pattern, data_populated, skip, job_id) values( 'fsastore', 1336, 'All', '/', 1,0,'test123')"

class mockdec():
    def deferred(self,fn):
        return fn
    def error_handling(self,fn):
        return fn

class AdvertiserDataTest(AsyncHTTPTestCase):

    def get_app(self):
        self.db = lnk.dbs.test

        self.db.execute(CREATE_ADVERTISER_TABLE)
        self.db.execute(CREATE_SEGMENT_TABLE)

        self.db.execute(FIXTURE1)
        self.db.execute(FIXTURE2)

        class mockdec():
            def deferred(self,fn):
                return fn
            def error_handling(self,fn): 
                return fn
        mock.patch('lib.helpers.decorators', mockdec()).start()
        import imp
        imp.reload(advertiser_data)

        self.app = Application([
          ('/', advertiser_data.AdvertiserDataHandler, dict(db=self.db)),
        ],
            cookie_secret="rickotoole"
        )

        return self.app

    def tearDown(self):
        self.db.execute(DROP_ADVERTISER)
        self.db.execute(DROP_SEGMENT)

    def test_get(self):
        expected = {}
        resp = self.fetch("/",method="GET")
        response = ujson.loads(resp.body)
        print response
        self.assertEqual(response, {"fsastore": {"segments": [{"data_populated": 1, "filter_id": 1336, "pattern": "/"}], "has_data": 1}})

