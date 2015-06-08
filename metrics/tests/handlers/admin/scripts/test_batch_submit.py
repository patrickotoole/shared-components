import sys
import mock
import os
from tornado.httpclient import HTTPResponse
from tornado.httpclient import HTTPRequest
sys.path.append("../../../../")

from tornado.testing import AsyncHTTPTestCase
from tornado.web import Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode

import unittest
import mock
import ujson
from mock import MagicMock, patch
from link import lnk
from metrics.handlers.admin.scripts.batch_submit import BatchSubmitHandler
from metrics.handlers.admin.scripts.batch_log import BatchLogHandler

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

TO_SUBMIT = {
        "uids":["5964788110813405229,1478777:0:10", "4108050305670841316,1478777:0:10"], 
        "source_type": "opt_script", 
        "source_name":"some_script"
        }

TO_INSERT = {
        u'source_name': u'some_script',
        u'num_users': 2, 
        u'job_id': u'789fgh',
        u'source_type': u'opt_script', 
        }

FIXTURE_3 = TO_INSERT.copy()
FIXTURE_3.update(FIXTURE_EXTRAS)


class EmptyObject(object):
    pass

class BatchLogHandlerTest(AsyncHTTPTestCase):

    def get_app(self):
        self.maxDiff = 1024

        self.db = lnk.dbs.test
        self.mock_api = mock.MagicMock()

        # Create test tables
        self.db.execute("DROP TABLE IF EXISTS batch_log_v2")
        self.db.execute(CREATE)

        self.app = Application([
                ('/submit', BatchSubmitHandler, dict(reporting_db=self.db, api=self.mock_api)),
                ('/submit/(.*?)', BatchSubmitHandler, dict(reporting_db=self.db, api=self.mock_api)),
                ('/log', BatchLogHandler, dict(reporting_db=self.db, api=self.mock_api)),
                ('/log/(.*?)', BatchLogHandler, dict(reporting_db=self.db, api=self.mock_api))
        ], cookie_secret = "rickotoole" )

        return self.app

    def tearDown(self):
        self.db.execute("DROP TABLE batch_log_v2")
        pass

    @mock.patch.object(BatchSubmitHandler, 'push_job_request', autospec=True)
    @mock.patch.object(BatchSubmitHandler, 'get_new_job', autospec=True)
    def test_submit(self, mock_get_new_job, mock_push_job_request):
        mock_get_new_job.return_value = {
            "response": {
                "batch_segment_upload_job": {
                    "job_id": "12345",
                    "upload_url": "http://www.thisisfake.com/12345"
                    }
                }
            }

        def side_effect_ex(self, *args):
            job_url, body, num_users = args
            response = EmptyObject()
            response.body=ujson.dumps({
                "response": {
                    "segment_upload": {
                        "job_id": "789fgh"
                        }
                    }
                })
            self.log_submission(num_users, response)

        mock_push_job_request.side_effect = side_effect_ex

        response = self.fetch("/submit", method="POST", body=ujson.dumps(TO_SUBMIT))
        args,kwargs = mock_push_job_request.call_args

        data = ujson.loads(self.fetch("/log?format=json", method="GET").body)
        
        for i in data:
            del i["start_time"]

        self.assertEqual([FIXTURE_3], data)
        
        
