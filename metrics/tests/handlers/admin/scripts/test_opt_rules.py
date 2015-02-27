import sys
import mock
import os
import ujson
sys.path.append("../../../../")

from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

import unittest
import metrics.handlers.admin.scripts.opt_rules as handler

CREATE_TABLE = """
CREATE TABLE opt_rules ( 
    rule_group_id int(11) NOT NULL, 
    rule_group_name varchar(100) NOT NULL,
    rule varchar(1000) NOT NULL,
    active tinyint(1) DEFAULT 1,
    created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

FIXTURE1 = """
INSERT INTO opt_rules (rule_group_id, rule_group_name, rule, created) 
VALUES (1,'rulegroup1','rule1', '2015-02-25 21:34:06')
"""

FIXTURE2 = """
INSERT INTO opt_rules (rule_group_id, rule_group_name, rule, created) 
VALUES (2,'rulegroup2','rule1', '2015-02-25 21:34:06')
"""

FIXTURE3 = """
INSERT INTO opt_rules (rule_group_id, rule_group_name, rule, created) 
VALUES (2,'rulegroup2','rule2', '2015-02-25 21:34:06')
""" 

class OptRulesTest(AsyncHTTPTestCase):

    def get_app(self):
        self.maxDiff = 1024
        self.db = lnk.dbs.test

        self.db.execute(CREATE_TABLE)
        self.db.execute(FIXTURE1)
        self.db.execute(FIXTURE2)
        self.db.execute(FIXTURE3)

        self.app = Application([
          ('/', handler.OptRulesHandler, dict(reporting_db=self.db, api=None)),
          ('/(.*?)', handler.OptRulesHandler, dict(reporting_db=self.db, api=None)) 
        ],
            cookie_secret="rickotoole"
        )
        
        return self.app

    def tearDown(self):
        self.db.execute("DROP TABLE opt_rules")
  
    def test_get_all(self):
        expected = [
            {"rule_group_id":1,"rule_group_name":"rulegroup1","rule":"rule1", "created": 1424900046, "active": 1},
            {"rule_group_id":2,"rule_group_name":"rulegroup2","rule":"rule1", "created": 1424900046, "active": 1},
            {"rule_group_id":2,"rule_group_name":"rulegroup2","rule":"rule2", "created": 1424900046, "active": 1}
        ]
        response = ujson.loads(self.fetch("/",method="GET").body)
        self.assertEqual(response,expected)
        
    def test_get_new_id(self):
        pass

    def test_get_by_id(self):
        expected = [
            {"rule_group_id":2,"rule_group_name":"rulegroup2","rule":"rule1", "created": 1424900046, "active": 1},
            {"rule_group_id":2,"rule_group_name":"rulegroup2","rule":"rule2", "created": 1424900046, "active": 1}
        ]
        response = ujson.loads(self.fetch("/2",method="GET").body)
        self.assertEqual(response,expected)
     
    def test_post_fails(self):
        body = self.fetch("/",method="POST",body="{}").body
        self.assertEqual(body,"required_columns: rule_group_name, rules")

    def test_post_success(self):
        to_post = {
            'rule_group_name':'da_best_rules',
            'rules':['the', "best", "rule"]
        }
        to_post_json = ujson.dumps(to_post)

        expected = [
            {"active": 1, "rule_group_id": 3, "rule_group_name": "da_best_rules", "rule": "the"},
            {"active": 1, "rule_group_id": 3, "rule_group_name": "da_best_rules", "rule": "best"},
            {"active": 1, "rule_group_id": 3, "rule_group_name": "da_best_rules", "rule": "rule"}
        ]

        body = ujson.loads(self.fetch("/",method="POST",body=to_post_json).body)

        # Don't check the created column, it's not really predictable
        for i in body:
            del i["created"]

        self.assertEqual(body,expected)
