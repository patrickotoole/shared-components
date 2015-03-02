import sys
import lib.helpers
import os
import ujson
import importlib
sys.path.append("../../../../")

import metrics.handlers.admin.scripts.opt_log as handler

from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

from twisted.internet import defer

import unittest

import tornado.platform.twisted
tornado.platform.twisted.install()

from twisted.internet import reactor

CREATE_TABLE = """
CREATE TABLE opt_log (
  value_group_id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  rule_group_id int(11) NOT NULL,
  last_modified timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  object_modified varchar(100) NOT NULL,
  campaign_id int(11) NOT NULL,
  profile_id int(11) NOT NULL,
  field_name varchar(100) NOT NULL,
  field_old_value varchar(500) NOT NULL,
  field_new_value varchar(500) NOT NULL
)
"""

CREATE_RULES_TABLE = """
CREATE TABLE opt_rules (
    rule_group_id int(11) NOT NULL,
    rule_group_name varchar(100) NOT NULL,
    rule varchar(1000) NOT NULL,
    active tinyint(1) DEFAULT 1,
    created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

RULES_FIXTURE1 = """
INSERT INTO opt_rules (rule_group_id, rule_group_name, rule, created) 
VALUES (1,'rulegroup1','rule1', '2015-02-25 21:34:06')
"""

FIXTURE1 = """
INSERT INTO opt_log
    (rule_group_id, object_modified, campaign_id, profile_id, field_name, field_old_value, field_new_value)
VALUES
    (1, "campaign", 7318310, 22595617, "state", "inactive", "active")
"""

FIXTURE3 = """
INSERT INTO opt_log
    (rule_group_id, object_modified, campaign_id, profile_id, field_name, field_old_value, field_new_value)
VALUES
    (1, "campaign", 7318310, 22595617, "state", "inactive", "active")
"""

FIXTURE2 = """
INSERT INTO opt_log
    (rule_group_id, object_modified, campaign_id, profile_id, field_name, field_old_value, field_new_value)
VALUES
    (1, "campaign", 7318310, 22595617, "state", "inactive", "active")
"""


class OptLogTest(AsyncHTTPTestCase):

    def get_app(self):
        self.maxDiff = 1024
        self.db = lnk.dbs.test

        self.db.execute(CREATE_TABLE)
        self.db.execute(CREATE_RULES_TABLE)

        self.db.execute(RULES_FIXTURE1)

        self.db.execute(FIXTURE1)
        self.db.execute(FIXTURE2)
        self.db.execute(FIXTURE3)

        self.app = Application([
          ('/', handler.OptLogHandler, dict(reporting_db=self.db, api=None)),
          ('/(.*?)', handler.OptLogHandler, dict(reporting_db=self.db, api=None)) 
        ],
            cookie_secret="rickotoole"
        )

        return self.app

    def tearDown(self):
        self.db.execute("DROP TABLE opt_log")
        self.db.execute("DROP TABLE opt_rules")

    def test_get_all(self):
        expected = [
            {
                "rule_group_id": 1, 
                "field_new_value": "active", 
                "profile_id": 22595617,
                "campaign_id": 7318310, 
                "object_modified": "campaign",
                "value_group_id": 1, 
                "field_old_value": "inactive", 
                "field_name": "state"
            },
            {
                "rule_group_id": 1, 
                "field_new_value": "active", 
                "profile_id": 22595617,
                "campaign_id": 7318310, 
                "object_modified": "campaign",
                "value_group_id": 2, 
                "field_old_value": "inactive", 
                "field_name": "state"
            },
            {
                "rule_group_id": 1, 
                "field_new_value": "active", 
                "profile_id": 22595617,
                "campaign_id": 7318310, 
                "object_modified": "campaign",
                "value_group_id": 3, 
                "field_old_value": "inactive", 
                "field_name": "state"
            }
        ]

        response = ujson.loads(self.fetch("/",method="GET").body)

        for r in response:
            del r["last_modified"]

        self.assertEqual(response,expected)
        
    def test_get_by_id(self):
        expected = [
            {
                "rule_group_id": 1, 
                "field_new_value": "active", 
                "profile_id": 22595617,
                "campaign_id": 7318310, 
                "object_modified": "campaign",
                "value_group_id": 3, 
                "field_old_value": "inactive", 
                "field_name": "state"
            }
        ]
        response = ujson.loads(self.fetch("/3",method="GET").body)

        for r in response:
            del r["last_modified"]
        self.assertEqual(response,expected)
     
    def test_post_fails(self):
        body = ujson.loads(self.fetch("/",method="POST",body="{}").body)
        self.assertEqual(body["response"],
                         "required columns: object_modified, campaign_id, " +
                         "field_name, field_old_value, field_new_value, " + 
                         "metric_values, rule_group_id")
        self.assertEqual(body["status"], "error")


    def test_post_success(self):
        to_post = {
            "rule_group_id": 1,
            "field_old_value": "inactive",
            "field_new_value": "active",
            "campaign_id": 7318310,
            "object_modified": "campaign",
            "field_name": "state",
            "metric_values": {
                "metric1": 29348,
                "metric2": 123.0129
            }
        }
        to_post_json = ujson.dumps(to_post)

        print self.fetch("/", method="POST", body=to_post_json).body

    #     expected = [
    #         {"active": 1, "rule_group_id": 3, "rule_group_name": "da_best_rules", "rule": "the"},
    #         {"active": 1, "rule_group_id": 3, "rule_group_name": "da_best_rules", "rule": "best"},
    #         {"active": 1, "rule_group_id": 3, "rule_group_name": "da_best_rules", "rule": "rule"}
    #     ]

    #     body = ujson.loads(self.fetch("/",method="POST",body=to_post_json).body)

    #     # Don't check the created column, it's not really predictable
    #     for i in body["response"]:
    #         del i["created"]

    #     self.assertEqual(body["response"],expected)
