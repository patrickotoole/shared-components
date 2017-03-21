from tornado.testing import AsyncHTTPTestCase 
from tornado.web import  Application, RequestHandler 
import unittest
import mock
import ujson
from link import lnk 
import logging
import handlers.advertiser as advertiser

CREATE_ADVERTISER_TABLE = """
CREATE TABLE `advertiser` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `external_advertiser_id` int(10) unsigned DEFAULT NULL,
  `pixel_source_name` varchar(250) DEFAULT NULL,
  `advertiser_goal` decimal(5,2) DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `last_activity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `advertiser_name` varchar(250) DEFAULT NULL,
  `min_report_date` datetime DEFAULT '2014-01-01 00:00:00',
  `active` int(1) DEFAULT '1',
  `monthly_budget` int(10) DEFAULT '0',
  `owner` varchar(200) DEFAULT '0',
  `running` int(1) DEFAULT '1',
  `client_goals` varchar(1000) DEFAULT NULL,
  `reporting_type` enum('internal','external') DEFAULT 'internal',
  `media_trader` varchar(200) DEFAULT NULL,
  `client_type` enum('direct','agency','yoshi','data_analysis','hindsight','foresight','test') DEFAULT 'agency',
  `media_trader_slack_name` varchar(100) DEFAULT NULL,
  `client_sld` varchar(100) DEFAULT NULL,
  `crusher` tinyint(1) DEFAULT '0',
  `valid_crusher_pixel` tinyint(1) DEFAULT NULL,
  `media_trader_priority` int(10) DEFAULT NULL,
  `account_manager` varchar(200) DEFAULT NULL,
  `salesperson` varchar(200) DEFAULT NULL,
  `io_start_date` datetime DEFAULT NULL,
  `io_end_date` datetime DEFAULT NULL,
  `io_budget` decimal(10,2) DEFAULT NULL,
  `reporting_week_start_date` int(1) DEFAULT '1',
  `media` tinyint(1) DEFAULT '0',
  `margin_goal` decimal(5,2) DEFAULT '0.40',
  `flexibility_between_lines` enum('yes','no') DEFAULT 'yes',
  `pacing_type` enum('budget','impressions') DEFAULT 'budget',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_advertiser` (`external_advertiser_id`)
)
"""

CREATE_ADVERTISER_SEGMENT = """
CREATE TABLE `advertiser_segment` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `external_advertiser_id` int(10) unsigned DEFAULT NULL,
  `external_member_id` int(10) unsigned DEFAULT NULL,
  `external_segment_id` int(10) unsigned DEFAULT NULL,
  `segment_name` varchar(200) DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `last_activity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `segment_implemented` blob,
  `active` tinyint(1) DEFAULT NULL,
  `segment_raw` varchar(1000) DEFAULT NULL,
  `segment_fields` varchar(1000) DEFAULT NULL,
  `segment_description` blob,
  `notes` blob,
  PRIMARY KEY (`id`),
  UNIQUE KEY `external_segment_id` (`external_segment_id`)
)
"""

ADVERTISER_FIXTURE_1 = """
INSERT INTO advertiser (`id`,`external_advertiser_id`,`pixel_source_name`, `client_type`, `crusher`, `advertiser_name`, `deleted`, `active`) 
VALUES (0,0,"mulberry","hindsight",1,"Test",0,1)
"""


class AdvertiserTest(AsyncHTTPTestCase):

    
    def get_app(self):        
        self.db = lnk.dbs.test

        
        len_check = self.db.execute("show tables like 'advertiser'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE advertiser")
        len_check = self.db.execute("show tables like 'advertiser_segment'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE advertiser_segment")

        self.db.execute(CREATE_ADVERTISER_TABLE)
        self.db.execute(CREATE_ADVERTISER_SEGMENT)
        self.db.execute(ADVERTISER_FIXTURE_1)

        self.app = Application([
            ('/',advertiser.AdvertiserHandler, dict(db=self.db)),
            ('/(.*?)',advertiser.AdvertiserHandler, dict(db=self.db)) 
          ],
          template_path="../../../templates"
        )

        advertiser.AdvertiserHandler.get_secure_cookie = mock.Mock(return_value=0)
        #.side_effect = lambda x : 0
        #advertiser.AdvertiserHandler.current_advertiser = mock.Mock(return_value=0)
        return self.app

    def tearDown(self):
        self.db.execute("DROP TABLE advertiser")
        
    def test_get(self):        
        _a = ujson.loads(self.fetch("/?format=json",method="GET").body)
        print _a
        self.assertTrue(len(_a[0])>1)
        self.assertTrue("advertiser_name" in _a[0].keys())

    def test_post(self):
        advertiser_json = """{
          "advertiser_name": "floor",
          "pixel_source_name" : "mulberry",
          "client_sld": "not sure wht this is",
          "deleted":"0",
        }"""

        _a = self.fetch("/",method="POST",body=advertiser_json).body
        ajson = ujson.loads(_a)
        #self.assertTrue(len(ajson)>1)
        #self.assertTrue("advertiser_name" in ajson.keys())
