import sys
import mock
import os
import ujson
import pandas
sys.path.append("../../../")

from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

import unittest
import mock
from mock import MagicMock, patch
import metrics.handlers.reporting.base as b
from metrics.handlers.reporting.domain_reporting import DomainReportingHandler, BaseHandler
import metrics.handlers.reporting.reporting as r
CREATE_CAMPAIGN_TABLE = """
CREATE TABLE `advertiser_campaign` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `external_advertiser_id` int(10) unsigned DEFAULT NULL,
  `campaign_id` int(10) unsigned DEFAULT NULL,
  `campaign_name` varchar(200) DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `last_activity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `external_segment_id` (`campaign_id`)
)
"""
CREATE_BUCKET_TABLE = """
CREATE TABLE `campaign_bucket` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `external_advertiser_id` int(10) unsigned DEFAULT NULL,
  `campaign_id` int(10) DEFAULT NULL,
  `bucket_name` varchar(100) DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `last_activity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `active` int(1) DEFAULT '1',
  PRIMARY KEY (`id`)
)
"""
INSERT_ADVERTISER_CAMPAIGN = """
INSERT INTO advertiser_campaign 
  (`external_advertiser_id`,`campaign_id`,`campaign_name`) 
values 
  ('1','1','1'),
  ('2','2','2')
"""
INSERT_CAMPAIGN_BUCKET = """
INSERT INTO campaign_bucket
  (`external_advertiser_id`, `campaign_id`, `bucket_name`) 
VALUES
  ('1','1',"bucket1"),
  ('1','2',"bucket2")
"""

class ReportingBaseTest(unittest.TestCase):
    def setUp(self):
        self.db = lnk.dbs.test
        self.db.execute(CREATE_CAMPAIGN_TABLE)
        self.db.execute(CREATE_BUCKET_TABLE)

        self.db.execute(INSERT_ADVERTISER_CAMPAIGN)
        self.db.execute(INSERT_CAMPAIGN_BUCKET)

        self.base = b.ReportingBase()
        self.base.initialize(self.db,MagicMock())

    def tearDown(self):
        self.db.execute("DROP TABLE advertiser_campaign;")
        self.db.execute("DROP TABLE campaign_bucket;")

    def test_get_all_advertiser_campaigns(self):
        result = self.base.get_advertiser_campaigns(1)
        self.assertEqual(result.values,[[1]])
        self.assertEqual(result.columns,["campaign_id"])

        self.assertRaises(Exception,self.base.get_advertiser_campaigns,3)

    def test_get_campaign_bucket_campaigns(self):
        result = self.base.get_advertiser_bucket_campaigns(1,"bucket1")
        self.assertEqual(result.values,[[1]])
        self.assertEqual(result.columns,["campaign_id"]) 

        with self.assertRaises(Exception):
            self.base.get_advertiser_bucket_campaigns(2,"bucket2")   

class DomainReportingBaseTest(unittest.TestCase):
    def setUp(self):
        self.base = b.ReportingBase()
        self.base.initialize(MagicMock(),MagicMock())

    def tearDown(self):
        pass


class DomainReportingTest(AsyncHTTPTestCase):

    def get_app(self):
        self.db = lnk.dbs.test
        dirname = os.path.dirname(os.path.realpath(__file__)) + "../../../../templates"
        self.app = Application([
            ('/',DomainReportingHandler,dict(db=self.db,api=MagicMock(),hive=MagicMock()))
        ],
            cookie_secret="rickotoole",
            login_url="/bad",
            template_path= dirname
        )
        return self.app

    def tearDown(self):
        self.db.execute("DROP TABLE advertiser_campaign;")
        self.db.execute("DROP TABLE campaign_bucket;")

    @patch.multiple(DomainReportingHandler,
        get_current_advertiser=mock.DEFAULT,
        get_current_user=mock.DEFAULT
    )
    def test_reporting_advertiser(self,get_current_advertiser, get_current_user):
        """
        # ensures were using pull_advertiser_domain
        """
        get_current_advertiser.return_value = 1
        get_current_user.return_value = 1
        EXPECTED = [{"advertiser":0}]
        with patch.object(DomainReportingHandler,"pull_advertiser_domain") as m:
            m.return_value = pandas.DataFrame(EXPECTED)
            body = ujson.loads(self.fetch("/?format=json", method="GET").body)
        self.assertEqual(EXPECTED[0].keys(),body[0].keys())

    @patch.multiple(DomainReportingHandler,
        get_current_advertiser=mock.DEFAULT,
        get_current_user=mock.DEFAULT
    )
    def test_reporting_bucket(self,get_current_advertiser, get_current_user):
        get_current_advertiser.return_value = 1
        get_current_user.return_value = 1

        EXPECTED = lambda x: [{"bucket":x}]
        with patch.object(DomainReportingHandler,"pull_bucket") as m:
            m.return_value = pandas.DataFrame(EXPECTED(1))
            body = ujson.loads(self.fetch("/?group=yo&format=json", method="GET").body)

        self.assertEqual(EXPECTED(10)[0].keys(),body[0].keys())
        self.assertEqual(1,body[0].values()[0])

    @patch.multiple(DomainReportingHandler,
        get_current_advertiser=mock.DEFAULT,
        get_current_user=mock.DEFAULT
    )
    def test_reporting_campaign(self,get_current_advertiser, get_current_user):
        get_current_advertiser.return_value = 1
        get_current_user.return_value = 1

        EXPECTED = lambda x: [{"campaign":x}]
        with patch.object(DomainReportingHandler,"pull_hive_campaigns") as m:
            m.return_value = pandas.DataFrame(EXPECTED(1))
            body = ujson.loads(self.fetch("/?campaign=1&format=json", method="GET").body)

        self.assertEqual(EXPECTED(1)[0].keys(),body[0].keys())
        self.assertEqual(1,body[0].values()[0])
    
