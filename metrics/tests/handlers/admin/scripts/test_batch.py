import sys
import mock
import os
sys.path.append("../../../../")

from tornado.testing import AsyncHTTPTestCase
from tornado.web import Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode

import unittest
import mock
import ujson
from mock import MagicMock, patch
from link import lnk
from metrics.handlers.admin.scripts.batch import BatchRequestBase
from metrics.handlers.admin.scripts.batch import BatchRequestsHandler
from metrics.handlers.admin.scripts.batch import BatchRequestFormHandler

INSERT_BATCH_REQUEST = '''
INSERT INTO batch_request
    (type, content, owner, target_segment, expiration, active, comment)
VALUES ('{}','{}', '{}', '{}', {}, {}, '{}');
'''

GOOD_HIVE_QUERY='''
SELECT DISTINCT  uid, concat(
CASE
    WHEN segment LIKE "%on_demand%" THEN "1980543" 
    WHEN segment LIKE '%25_a_day%' THEN '1980544' 
    WHEN segment LIKE '%enhanced%' THEN '1980545' 
END,':10:0') as rhs 
FROM pixel_data 
WHERE
    source='offset' AND 
    date >='14-08-21' AND
    (
        segment LIKE '1694352%on_demand%' OR 
        segment like '1694352%25_a_day%' OR 
        segment like '1694352%enhanced%'
    ) AND
    uid !="0"
'''

CLEAN_HIVE_QUERY='SELECT DISTINCT uid, concat( CASE WHEN segment LIKE "%on_demand%" THEN "1980543" WHEN segment LIKE \'%25_a_day%\' THEN \'1980544\' WHEN segment LIKE \'%enhanced%\' THEN \'1980545\' END,\':10:0\') as rhs FROM pixel_data WHERE source=\'offset\' AND date >=\'14-08-21\' AND ( segment LIKE \'1694352%on_demand%\' OR segment like \'1694352%25_a_day%\' OR segment like \'1694352%enhanced%\' ) AND uid !="0"'

# Domain_List-specific parameters
CONTENT = "baublebar_prospects:3#30"

# General parameters
OWNER = "will@rockerbox.com"
TARGET_SEGMENT = "999999"
EXPIRATION = 30
ACTIVE = 1
COMMENT = "This is a test comment."

# Fixtures for hive_query requests
HIVE_QUERY_PARAMS = ("hive_query", GOOD_HIVE_QUERY, OWNER, TARGET_SEGMENT, EXPIRATION, ACTIVE, COMMENT) 
INSERT_HIVE_REQUEST = INSERT_BATCH_REQUEST.format( *HIVE_QUERY_PARAMS )

# Fixtures for domain_list requests
DOMAIN_LIST_PARAMS = ("domain_list", CONTENT, OWNER, TARGET_SEGMENT, EXPIRATION, ACTIVE, COMMENT)
INSERT_DOMAIN_REQUEST = INSERT_BATCH_REQUEST.format( *DOMAIN_LIST_PARAMS )

# Initilization Steps
CREATE_REQUEST_TABLE = "CREATE TABLE batch_request (id int NOT NULL AUTO_INCREMENT, type varchar(100) NOT NULL, content varchar(5000) NOT NULL, owner varchar(100) NOT NULL, target_segment varchar(100) NOT NULL, expiration int NOT NULL, active int(1) NOT NULL, comment varchar(5000) NOT NULL, requested_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`))"

CREATE_DOMAIN_LIST_TABLE = '''CREATE TABLE domain_list (
  id int(11) NOT NULL AUTO_INCREMENT,
  log varchar(100) DEFAULT NULL,
  pattern varchar(100) DEFAULT NULL,
  segment varchar(100) DEFAULT NULL,
  throttle int(11) DEFAULT NULL,
  name varchar(100) DEFAULT NULL,
  active tinyint(1) DEFAULT NULL,
  test tinyint(1) DEFAULT NULL,
  last_update timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
)'''

INSERT_DOMAIN_LIST = '''
INSERT INTO domain_list 
(id, log, pattern, segment, throttle, name, active, test, last_update)  VALUES
(24,"test","bitcoin","bad",NULL,NULL,0,0,"2014-08-13 20:35:01")
'''

INSERT_ACTIVE_REQUEST = '''
INSERT INTO batch_request 
(id, type, content, owner, target_segment, expiration, active, comment) VALUES
(99, "domain_list", "bitcoin#20", "will@rockerbox.com", "999999", 30, 1, "This is a test comment.")
'''

INSERT_INACTIVE_REQUEST = '''
INSERT INTO batch_request 
(id, type, content, owner, target_segment, expiration, active, comment) VALUES
(98, "domain_list", "bitcoin#20", "will@rockerbox.com", "999999", 30, 0, "This is a test comment.")
'''

class BatchRequestBaseTest(AsyncHTTPTestCase):
    
    def get_app(self):
        self.maxDiff = 1024
        self.db = lnk.dbs.test
        
        self.base = BatchRequestBase()
        self.base.initialize(db=self.db, hive=None, api=None)

        # Create test tables
        self.db.execute(CREATE_REQUEST_TABLE)
        self.db.execute(CREATE_DOMAIN_LIST_TABLE)
        
        # Insert a test domain list entry
        self.db.execute(INSERT_DOMAIN_LIST)

        # Insert a test request entry
        self.db.execute(INSERT_ACTIVE_REQUEST)
        self.db.execute(INSERT_INACTIVE_REQUEST)

        self.app = Application([
                ('/admin/batch_requests', BatchRequestsHandler, dict(db=self.db, hive = None, api=None)),
                ('/admin/batch_request/new', BatchRequestFormHandler, dict(db=self.db, hive = None, api=None))
        ], cookie_secret = "rickotoole" )

        return self.app

    def tearDown(self):
        self.db.execute("DROP TABLE batch_request")
        self.db.execute("DROP TABLE domain_list")
        pass

    def test_pull_segments(self):
         blah = self.base.pull_segments()
         expected = ["test"]
         self.assertEqual(blah, expected)

    def test_insert_request(self):
        blah = self.base.insert_request( *(HIVE_QUERY_PARAMS))
        expected = [
            {
                "comment": "This is a test comment.",
                "content":"bitcoin#20", 
                "target_segment": "999999",
                "id":98, 
                "type":"domain_list", 
                "owner": "will@rockerbox.com", 
                "expiration": 30,
                "active": 0
                },
            {
                "comment": "This is a test comment.",
                "content":"bitcoin#20", 
                "target_segment": "999999",
                "id":99, 
                "type":"domain_list", 
                "owner": "will@rockerbox.com", 
                "expiration": 30,
                "active": 1
                },
            {
                "comment": "This is a test comment.",
                "content":CLEAN_HIVE_QUERY, 
                "target_segment": "999999",
                "id":100, 
                "type":"hive_query", 
                "owner": "will@rockerbox.com", 
                "expiration": 30,
                "active": 1
                }
            ]
        
        response = ujson.loads(self.fetch("/admin/batch_requests?format=json",method="GET").body)

        for i in response:
            del i["requested_at"]

        self.assertEqual(expected, response)

    def test_deactivate_request(self):
        self.base.deactivate_request(99)

        expected = [
         {
             "comment": "This is a test comment.",
             "content":"bitcoin#20", 
             "target_segment": "999999",
             "id":98, 
             "type":"domain_list", 
             "owner": "will@rockerbox.com", 
             "expiration": 30,
             "active": 0
             },
         {
             "comment": "This is a test comment.",
             "content":"bitcoin#20", 
             "target_segment": "999999",
             "id":99, 
             "type":"domain_list", 
             "owner": "will@rockerbox.com", 
             "expiration": 30,
             "active": 0
             }
         ]

        response = ujson.loads(self.fetch("/admin/batch_requests?format=json",method="GET").body)

        for i in response:
            del i["requested_at"]

        self.assertEqual(expected, response)

    def test_activate_request(self):
        self.base.activate_request(98)

        expected = [
         {
             "comment": "This is a test comment.",
             "content":"bitcoin#20", 
             "target_segment": "999999",
             "id":98, 
             "type":"domain_list", 
             "owner": "will@rockerbox.com", 
             "expiration": 30,
             "active": 1
             },
         {
             "comment": "This is a test comment.",
             "content":"bitcoin#20", 
             "target_segment": "999999",
             "id":99, 
             "type":"domain_list", 
             "owner": "will@rockerbox.com", 
             "expiration": 30,
             "active": 1
             }
         ]

        response = ujson.loads(self.fetch("/admin/batch_requests?format=json",method="GET").body)

        for i in response:
            del i["requested_at"]

        self.assertEqual(expected, response)

    def test_clean_query(self):
        blah = self.base.clean_query(GOOD_HIVE_QUERY)

        # Undo escape since this will happen before inserting
        blah = blah.replace("\\'", "'")

        self.assertEqual(blah, CLEAN_HIVE_QUERY)
        
    def test_clean_target_segment(self):
        blah = self.base.clean_target_segment("999999")
        self.assertEqual(blah, "999999:0")

    


