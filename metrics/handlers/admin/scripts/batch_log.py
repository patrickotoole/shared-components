import tornado.web
import ujson
import functools
import re
from twisted.internet import defer
from tornado.httpclient import *
from lib.helpers import *

INSERT = """
INSERT INTO {}
({})
VALUES
({})
"""

class BatchLogHandler(tornado.web.RequestHandler):

    def initialize(self, reporting_db=None, api=None, db=None):
        self.db = reporting_db
        self.api = api

    def make_insert_query(self, table_name):
        df = self.db.select_dataframe("describe {}".format(table_name))
        variables = df[["field","type"]].set_index("field").to_dict(orient="dict")["type"]

        placeholders = []

        p = re.compile("(timestamp|varchar).*")
        for k,v in variables.iteritems():
            if p.match(v):
                placeholders.append('"%({})s"'.format(k))
            else:
                placeholders.append('%({})s'.format(k))

        schema = ','.join(variables)
        values = ','.join(placeholders)
        
        query = INSERT.format(table_name, schema, values)

        return query

    def get(self):
        self.write(self.make_insert_query("batch_log_v2"))

    def post(self):
        job_id = self.get_argument("id", False)
        if job_id:
            url = "/batch-segment?job_id={}".format(job_id)
        else:
            url = "/batch-segment?start_element=0&sort=last_modified.desc"
        data = self.api.get(url)

        # Extract data from POST request

        # Check if job_id is already logged in batch_log_2
            # If so, then return a message stating that it has already been logged
        
        self.write(data.json)

    def log(self):
        pass
