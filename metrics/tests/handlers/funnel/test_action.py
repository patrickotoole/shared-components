from tornado.testing import AsyncHTTPTestCase 
from tornado.web import  Application, RequestHandler 
import unittest
import mock
import mocks.yoshi as mocks
import ujson
from link import lnk 

import handlers.admin.scripts.funnel.action as action

CREATE_ACTION_TABLE = """
CREATE TABLE `action` (
  `action_id` int(11) NOT NULL AUTO_INCREMENT,
  `start_date` varchar(8) NOT NULL,
  `end_date` varchar(8) NOT NULL,
  `operator` enum('and','or') NOT NULL,
  `pixel_source_name` varchar(250) DEFAULT NULL,
  `action_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`action_id`)
)
"""

CREATE_PATTERN_TABLE = """
CREATE TABLE `action_patterns` (
  `action_id` int(11) NOT NULL,
  `url_pattern` varchar(3000) NOT NULL
)
"""

ACTION_FIXTURE_1 = """
INSERT INTO action (`action_id`,`start_date`,`end_date`, `operator`, `pixel_source_name`, `action_name`) 
VALUES (1,0,0,"and","alan","alans_action")
"""

ACTION_FIXTURE_2 = """
INSERT INTO action (`action_id`,`start_date`,`end_date`, `operator`, `pixel_source_name`, `action_name`) 
VALUES (2,0,0,"and","will","wills_action") 
"""

class ActionTest(AsyncHTTPTestCase):

    def get_app(self):
        self.db = lnk.dbs.test

        self.db.execute(CREATE_ACTION_TABLE) 
        self.db.execute(CREATE_PATTERN_TABLE)  
        self.db.execute(ACTION_FIXTURE_1)
        self.db.execute(ACTION_FIXTURE_2)

        self.app = Application([
          ('/',action.ActionHandler, dict(db=self.db)),
          ('/(.*?)',action.ActionHandler, dict(db=self.db)) 
        ])

        return self.app

    def tearDown(self):
        self.db.execute("DROP TABLE action")
        self.db.execute("DROP TABLE action_patterns")

    def test_get(self):
        _a = ujson.loads(self.fetch("/?advertiser=alan",method="GET").body)
        _b = ujson.loads(self.fetch("/",method="GET").body)
        self.assertEqual(len(_a),1)
        self.assertEqual(len(_b),2)

    def test_post(self):
        action_json = """{
          "advertiser": "homie",
          "action_name" : "yo homie",
          "url_patterns": ["a","b","c"],
          "operator": "and"
        }"""

        _a = self.fetch("/",method="POST",body=action_json).body

        ajson = ujson.loads(_a)
        ojson = ujson.loads(action_json)

        self.assertEqual(ajson['response']['action_name'],ojson['action_name'])
        self.assertEqual(ajson['response']['url_patterns'],ojson['url_patterns']) 
 
