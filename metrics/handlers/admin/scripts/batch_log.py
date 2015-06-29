import tornado.web
import ujson
import functools
import re
import functools
from twisted.internet import defer
from editable_base import EditableBaseHandler
from tornado.httpclient import *
from lib.helpers import *
from lib.mysql.helpers import run_mysql_deferred
from lib.mysql.helpers import execute_mysql_deferred

INSERT = """
INSERT INTO batch_log_v2 
(source_type, source_name, job_id, num_users) 
VALUES 
("%(source_type)s", "%(source_name)s", "%(job_id)s", %(num_users)s)
"""

GET = """
SELECT * FROM batch_log_v2 WHERE job_id="%(job_id)s"
"""

GET_ALL = """
SELECT * FROM batch_log_v2
"""

class BatchLogHandler(EditableBaseHandler):

    def initialize(self, reporting_db=None, api=None, db=None):
        self.db = reporting_db
        self.api = api

    def write_log(self, data):
        pass

    @defer.inlineCallbacks
    def get_logs(self, job_id):
        if job_id:
            df = yield run_mysql_deferred(self.db, GET % {"job_id": job_id})
        else:
            df = yield run_mysql_deferred(self.db, GET_ALL)
        self.write(Convert.df_to_json(df))
        self.finish()

    def template_to_query(self, template, values):
        cleaned = {}
        
        for k,v in values.iteritems():
            if v == None:
                cleaned[k] = "null"
            else:
                cleaned[k] = v
        return template % cleaned

    @defer.inlineCallbacks
    def create_log(self, data):
        insert = INSERT % data
        get_query = GET % data

        try:
            response = yield execute_mysql_deferred(self.db, insert)

            get_response = yield run_mysql_deferred(self.db, get_query)
            
            # Convert to json
            values = get_response.to_dict()
            values = {k:v[0] for k,v in values.iteritems()}

            self.write(ujson.dumps({"response":values}))
            self.finish()
        except Exception as e:
            self.write(ujson.dumps({"error": e}))
            self.finish()

    @tornado.web.asynchronous
    def get(self):
        job_id = self.get_argument("job_id", False)

        self.get_logs(job_id)

    @tornado.web.asynchronous
    def post(self):
        posted = ujson.loads(self.request.body)
        response = self.create_log(posted)

