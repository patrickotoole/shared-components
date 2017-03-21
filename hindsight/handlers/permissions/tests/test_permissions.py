import sys
import mock
import os
sys.path.append("../../../")
from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

import unittest
import handlers.permissions as user

CREATE_USER_TABLE="""
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `advertiser_id` int(11) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `password` varchar(2000) DEFAULT NULL,
  `show_reporting` tinyint(4) NOT NULL DEFAULT '1',
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  `send_email` int(1) DEFAULT '1',
  `deleted` int(1) DEFAULT '0',
  `nonce` varchar(256) DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
)
"""

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

CREATE_ADVERTISER_EMAIL = """
CREATE TABLE `advertiser_email` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `external_advertiser_id` int(10) unsigned DEFAULT NULL,
  `contact_name` varchar(250) DEFAULT NULL,
  `email` varchar(1000) DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `send_email` int(1) DEFAULT '1',
  `last_activity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
)
"""

dirname = os.path.dirname(os.path.realpath(__file__))
template_dir = "/".join(dirname.split("/")[:-4]) + "/metrics/templates"
print template_dir

class PermissionTest(AsyncHTTPTestCase):

    def get_app(self):
        db = lnk.dbs.test

        len_check = db.execute("show tables like 'user'")
        if len(len_check.as_dataframe())>0:
            db.execute("DROP TABLE user")
        len_check = db.execute("show tables like 'advertiser'")
        if len(len_check.as_dataframe())>0:
            db.execute("DROP TABLE advertiser")
        len_check = db.execute("show tables like 'advertiser_email'")
        if len(len_check.as_dataframe())>0:
            db.execute("DROP TABLE advertiser_email")

        db.execute(CREATE_USER_TABLE)
        db.execute(CREATE_ADVERTISER_TABLE)
        db.execute(CREATE_ADVERTISER_EMAIL)

        db.execute("insert into user (username, password, advertiser_id) values ('vanguard','$2a$08$CWAt/.lo3zsUo0cQld7lK.RzFvVJ6SKT6GfowBOrbGUjuQzwPEdAW',1)")

        dirname = os.path.dirname(os.path.realpath(__file__)) + "../../../templates"

        self.app = Application([('/', user.AccountPermissionsHandler, dict(db=db))],
            cookie_secret="rickotoole",
            template_path= template_dir
        )
        return self.app
  
    def test_logged_in(self):
        with mock.patch.object(user.AccountPermissionsHandler, "get_secure_cookie") as m:
            m.return_value = 'user_email'
            response = self.fetch('/', method='GET')
        #self.assertTrue("logged in" in to_unicode(response.body))

    def test_login_failure(self):
        logged_in = self.fetch('/',method="POST",body="""{"username":"bad"}""")
        self.assertTrue("0" in to_unicode(logged_in.body))



