import sys
import lib.helpers
import os
import ujson
import importlib
import mock
sys.path.append("../../../../")

from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

import unittest

from metrics.handlers.admin.scripts.opt import opt_log

CREATE_TABLE = """
CREATE TABLE opt_log (
  value_group_id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  rule_group_id int(11) NOT NULL,
  last_modified timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  object_modified varchar(100) NOT NULL,
  campaign_id int(11),
  profile_id int(11),
  domain_list_id int(11),
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

CREATE_VALUES_TABLE = """
CREATE TABLE opt_values (
    value_group_id int(11) NOT NULL,
    metric_name varchar(1000) NOT NULL,
    metric_value varchar(1000) NOT NULL
)
"""

RULES_FIXTURE1 = """
INSERT INTO opt_rules (rule_group_id, rule_group_name, rule, created) 
VALUES (1,'rulegroup1','rule1', '2015-02-25 21:34:06')
"""

FIXTURE1 = """
INSERT INTO opt_log
    (rule_group_id, object_modified, campaign_id, profile_id, domain_list_id, field_name, field_old_value, field_new_value)
VALUES
    (1, "campaign", 7318310, 22595617, null, "state", "inactive", "active")
"""

FIXTURE3 = """
INSERT INTO opt_log
    (rule_group_id, object_modified, campaign_id, profile_id, domain_list_id, field_name, field_old_value, field_new_value)
VALUES
    (1, "campaign", 7318310, 22595617, null, "state", "inactive", "active")
"""

FIXTURE2 = """
INSERT INTO opt_log
    (rule_group_id, object_modified, campaign_id, profile_id, domain_list_id, field_name, field_old_value, field_new_value)
VALUES
    (1, "campaign", 7318310, 22595617, null, "state", "inactive", "active")
"""


class OptLogTest(AsyncHTTPTestCase):

    def get_app(self):
        self.maxDiff = 1024
        self.db = lnk.dbs.test

        self.db.execute(CREATE_TABLE)
        self.db.execute(CREATE_RULES_TABLE)
        self.db.execute(CREATE_VALUES_TABLE)

        self.db.execute(RULES_FIXTURE1)

        self.db.execute(FIXTURE1)
        self.db.execute(FIXTURE2)
        self.db.execute(FIXTURE3)

        self.mock_api = mock.MagicMock()

        self.app = Application([
          ('/', opt_log.OptLogHandler, dict(reporting_db=self.db, api=self.mock_api)),
          ('/(.*?)', opt_log.OptLogHandler, dict(reporting_db=self.db, api=self.mock_api)) 
        ],
            cookie_secret="rickotoole"
        )

        return self.app

    def tearDown(self):
        self.db.execute("DROP TABLE opt_log")
        self.db.execute("DROP TABLE opt_rules")
        self.db.execute("DROP TABLE opt_values")

    def test_get_all(self):
        expected = [
            {
                "rule_group_id": 1, 
                "field_new_value": "active", 
                "profile_id": 22595617,
                "campaign_id": 7318310,
                "domain_list_id": 0,
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
                "domain_list_id": 0,
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
                "domain_list_id": 0,
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
                "domain_list_id": 0,
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
     
    def test_post_fails_required_columns(self):
        body = ujson.loads(self.fetch("/",method="POST",body="{}").body)
        self.assertEqual(body["response"],
                         "required columns: object_modified, " +
                         "field_name, field_old_value, field_new_value, " + 
                         "metric_values, rule_group_id")
        self.assertEqual(body["status"], "error")


    @mock.patch.object(opt_log.OptLogHandler, 'get_campaigns', autospec=True)
    def test_post_success(self, mock_get_campaigns):
        # Set the get_campaigns return value
        mock_get_campaigns.return_value = {
            "response":{
                "campaign": {
                    "profile_id":"987654", 
                    "state": "inactive"
                    }
                }
            }

        # Construct our POST object and submit it
        to_post = {
            "rule_group_id": 1,
            "field_old_value": "inactive",
            "field_new_value": "active",
            "campaign_id": 1234567,
            "object_modified": "campaign",
            "field_name": "state",
            "metric_values": {
                "metric1": 29348,
                "metric2": 123.0129
            }
        }
        to_post_json = ujson.dumps(to_post)
        response = ujson.loads(self.fetch("/", method="POST", body=to_post_json).body)

        # Check that get_campaigns was called with the correct argument
        args,kwargs =  mock_get_campaigns.call_args
        self.assertEqual(args[1], [1234567])
        
        # Check that the insert succeeded and that we have the correct object
        expected = {
            "rule_group_id": 1,
            "field_old_value": "inactive",
            "field_new_value": "active",
            "campaign_id": 1234567,
            "profile_id": 987654,
            "domain_list_id": 0,
            "object_modified": "campaign",
            "field_name": "state",
            "value_group_id": 4
        }

        # Don't want to check the last_modified time
        response["response"][0] = {k:v for k,v 
                                   in response["response"][0].iteritems() 
                                   if k != "last_modified"}

        self.assertEqual(response["status"], "ok")
        self.assertEqual(response["response"][0], expected)

    @mock.patch.object(opt_log.OptLogHandler, 'get_campaigns', autospec=True)
    def test_post_fails_unexpected_field_value(self, mock_get_campaigns):
        # Set the get_campaigns return value
        mock_get_campaigns.return_value = {
            "response":{
                "campaign": {
                    "profile_id":"987654", 
                    "state": "inactive"
                    }
                }
            }

        # Construct our POST object and submit it
        to_post = {
            "rule_group_id": 1,
            "field_old_value": "active",
            "field_new_value": "inactive",
            "campaign_id": 1234567,
            "object_modified": "campaign",
            "field_name": "state",
            "metric_values": {
                "metric1": 29348,
                "metric2": 123.0129
            }
        }
        to_post_json = ujson.dumps(to_post)
        response = ujson.loads(self.fetch("/", method="POST", body=to_post_json).body)

        # Check that get_campaigns was called with the correct argument
        args,kwargs =  mock_get_campaigns.call_args
        self.assertEqual(args[1], [1234567])
        
        expected = "current field value in AppNexus does not match field_old_value. inactive != active"
        
        self.assertEqual(response["status"], "error")
        self.assertEqual(response["response"], expected)

    @mock.patch.object(opt_log.OptLogHandler, 'get_domain_list', autospec=True)
    def test_post_domain_list(self, mock_get_domain_list):
        mock_get_domain_list.return_value = {
            "response": {
                "domain-list": {
                    "domains": [
                        "appnexus.com",
                        "rockerbox.com"
                        ]
                    }
                }
            }
        to_post = {
            "rule_group_id": 1,
            "field_old_value": ['appnexus.com', 'rockerbox.com'],
            "field_new_value": ['appnexus.com', 'google.com', 'rockerbox.com'],
            "domain_list_id": 414849,
            "object_modified": "domain_list",
            "field_name": "domains",
            "metric_values": {
                "metric1": 29348,
                "metric2": 123.0129
                }
            }

        to_post_json = ujson.dumps(to_post)
        response = ujson.loads(self.fetch("/", method="POST", body=to_post_json).body)

        # Check that get_domain_list was called with the correct argument

        args, kwargs = mock_get_domain_list.call_args
        self.assertEqual(args[1], 414849)
        
        expected = {
            "rule_group_id": 1,
            "field_old_value": "[u'appnexus.com', u'rockerbox.com']",
            "field_new_value": "[u'appnexus.com', u'google.com', u'rockerbox.com']",
            "domain_list_id": 414849,
            "profile_id": 0,
            "campaign_id": 0,
            "object_modified": "domain_list",
            "field_name": "domains",
            "value_group_id": 4
            }

        # Don't want to check the last_modified time
        response["response"][0] = {k:v for k,v 
                                   in response["response"][0].iteritems() 
                                   if k != "last_modified"}

        self.assertEqual(response["status"], "ok")

        self.assertTrue(response["response"][0] == expected)
