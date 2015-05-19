import mock
import os
import ujson

from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from link import lnk

import action 

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

        self.app = Application([
          ('/',action.ActionHandler, dict(db=self.db)),
          ('/(.*?)',action.ActionHandler, dict(db=self.db)) 
        ])

    def tearDown(self):
        self.db.execute("DROP TABLE action")
        self.db.execute("DROP TABLE action_patterns")

    def test_get(self):
        print self.fetch("/?advertiser=alan", method="GET")
        self.assertTrue(True)


 
