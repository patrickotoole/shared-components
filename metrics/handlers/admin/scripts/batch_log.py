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

class BatchLogHandler(EditableBaseHandler):

    def initialize(self, reporting_db=None, api=None, db=None):
        self.db = reporting_db
        self.api = api

    def write_log(self, data):
        pass

    def get(self):
        self.write("Put something here")

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
            values = get_response.to_dict(orient="list")
            values = {k:v[0] for k,v in values.iteritems()}

            self.write(ujson.dumps({"response":values}))
            self.finish()
        except Exception as e:
            self.write(ujson.dumps({"error": e}))
            self.finish()


    @tornado.web.asynchronous
    def post(self):
        posted = ujson.loads(self.request.body)
        job_id = self.get_argument("id")
        posted["job_id"] = job_id        

        response = self.create_log(posted)

    def log(self):
        pass
