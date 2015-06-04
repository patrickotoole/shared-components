import tornado.web
import ujson
import functools
import re
import functools
from twisted.internet import defer
from editable_base import EditableBaseHandler
from tornado.httpclient import *
from lib.helpers import *

class BatchLogHandler(EditableBaseHandler):

    def initialize(self, reporting_db=None, api=None, db=None):
        self.db = reporting_db
        self.api = api

    def write_log(self, data):
        pass

    def get(self):
        self.write(self.make_insert_query("batch_log_v2"))

    def template_to_query(self, template, values):
        cleaned = {}
        
        for k,v in values.iteritems():
            if v == None:
                cleaned[k] = "null"
            else:
                cleaned[k] = v
        return template % cleaned

    @tornado.web.asynchronous
    def post(self):
        posted = ujson.loads(self.request.body)
        job_id = self.get_argument("id")
        url = "/batch-segment?job_id={}".format(job_id)
        data = self.api.get(url).json["response"]["batch_segment_upload_job"]

        # Check if job_id is already logged in batch_log_2
            # If so, then return a message stating that it has already been logged

        combined = dict(data.items() + posted.items())

        self.write(ujson.dumps(combined))

        template = self.get_insert_template("batch_log_v2")
        cb = functools.partial(self.callback)

        print combined
        insert = self.template_to_query(template, combined)

        response = self.update(insert, callback=cb)
        self.write(response)
        

    def callback(self, response):
        print response

    def log(self):
        pass
