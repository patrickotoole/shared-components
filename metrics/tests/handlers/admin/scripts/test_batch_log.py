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
from metrics.handlers.admin.scripts.batch_log import BatchLogHandler

INSERT = """
INSERT INTO batch_log_v2
(source_type, source_name, job_id, num_users)
VALUES
("%(source_type)s", "%(source_name)s", "%(job_id)s", %(num_users)s)
"""

GET = """
SELECT * FROM batch_log_v2 WHERE job_id="%(job_id)s"
"""

# Initilization Steps
CREATE = """
CREATE TABLE batch_log_v2 (
  source_type varchar(100) DEFAULT NULL,
  source_name varchar(200) DEFAULT NULL,
  job_id varchar(100) NOT NULL,
  num_users int(11) DEFAULT NULL,
  phase varchar(100) DEFAULT NULL,
  start_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  uploaded_time timestamp NULL DEFAULT NULL,
  validated_time timestamp NULL DEFAULT NULL,
  completed_time timestamp NULL DEFAULT NULL,
  error_code int(11) DEFAULT NULL,
  time_to_process decimal(10,0) DEFAULT NULL,
  percent_complete int(11) DEFAULT NULL,
  num_valid int(11) DEFAULT NULL,
  num_invalid_format int(11) DEFAULT NULL,
  num_valid_user int(11) DEFAULT NULL,
  num_invalid_user int(11) DEFAULT NULL,
  num_invalid_segment int(11) DEFAULT NULL,
  num_invalid_timestamp int(11) DEFAULT NULL,
  num_unauth_segment int(11) DEFAULT NULL,
  num_past_expiration int(11) DEFAULT NULL,
  num_inactive_segment int(11) DEFAULT NULL,
  num_other_error int(11) DEFAULT NULL,
  PRIMARY KEY (job_id)
)
"""

FIXTURE_EXTRAS = {
        u'num_invalid_user': 0, 
        u'validated_time': 0, 
        u'num_valid': 0, 
        u'num_other_error': 0, 
        u'num_inactive_segment': 0, 
        u'uploaded_time': 0, 
        u'num_invalid_format': 0, 
        u'completed_time': 0, 
        u'num_invalid_segment': 0, 
        u'phase': 0, 
        u'percent_complete': 0, 
        u'num_unauth_segment': 0, 
        u'num_invalid_timestamp': 0, 
        u'num_past_expiration': 0, 
        u'time_to_process': 0, 
        u'num_valid_user': 0, 
        u'error_code': 0    
}

FIXTURE_1 = {
        u'source_name': u'some_script', 
        u'num_users': 4, 
        u'job_id': u'123abc', 
        u'source_type': u'opt_script', 
        }
FIXTURE_1.update(FIXTURE_EXTRAS)

DUPLICATE = {
        u'source_name': u'some_script', 
        u'num_users': 4, 
        u'job_id': u'456cde', 
        u'source_type': u'opt_script', 
        }
FIXTURE_2 = DUPLICATE.copy()
FIXTURE_2.update(FIXTURE_EXTRAS)

TO_INSERT = {
        u'source_name': u'some_script', 
        u'num_users': 4, 
        u'job_id': u'789fgh',
        u'source_type': u'opt_script', 
        }

FIXTURE_3 = TO_INSERT.copy()
FIXTURE_3.update(FIXTURE_EXTRAS)

ALL_FIXTURES = [FIXTURE_1, FIXTURE_2]

class BatchLogHandlerTest(AsyncHTTPTestCase):

    def get_app(self):
        self.maxDiff = 1024

        self.db = lnk.dbs.test
        self.mock_api = mock.MagicMock()

        # Create test tables
        self.db.execute("DROP TABLE IF EXISTS batch_log_v2")
        self.db.execute(CREATE)

        self.db.execute(INSERT % {
                "source_type": "opt_script", 
                "source_name": "some_script", 
                "job_id": "123abc", 
                "num_users": "4"
                })

        self.db.execute(INSERT % {
                "source_type": "opt_script", 
                "source_name": "some_script", 
                "job_id": "456cde", 
                "num_users": "4"
                })

        self.app = Application([
                ('/log', BatchLogHandler, dict(reporting_db=self.db, api=self.mock_api)),
                ('/log/(.*?)', BatchLogHandler, dict(reporting_db=self.db, api=self.mock_api))
        ], cookie_secret = "rickotoole" )

        return self.app

    def tearDown(self):
        self.db.execute("DROP TABLE batch_log_v2")
        pass

    def test_get_all(self):
        response = ujson.loads(self.fetch("/log?format=json", method="GET").body)

        for i in response:
            del i["start_time"]

        self.assertEqual(ALL_FIXTURES, response)


    def test_get(self):
        response = ujson.loads(self.fetch("/log?format=json&job_id=123abc", method="GET").body)

        for i in response:
            del i["start_time"]

        self.assertEqual([FIXTURE_1], response)

    def test_log(self):
        response = ujson.loads(self.fetch("/log", method="POST", body=ujson.dumps(TO_INSERT)).body)

        data = ujson.loads(self.fetch("/log?format=json&job_id=789fgh", method="GET").body)

        for i in data:
            del i["start_time"]

        self.assertEqual(data, [FIXTURE_3])

    def test_duplicate_log(self):
        response = ujson.loads(self.fetch("/log", method="POST", body=ujson.dumps(DUPLICATE)).body)
        self.assertTrue("error" in response)
