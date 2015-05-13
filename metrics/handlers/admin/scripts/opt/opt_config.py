import sys
sys.path.append("../")
from ..editable_base import EditableBaseHandler
import tornado.web
import ujson
import json
from twisted.internet import defer

from lib.mysql.helpers import run_mysql_deferred
from lib.mysql.helpers import execute_mysql_deferred
from lib.helpers import *

GET = """SELECT * FROM rockerbox.opt_config WHERE {}"""

INSERT = """
INSERT INTO rockerbox.opt_config 
    (opt_type, config_name, param, value) 
VALUES 
    ("%(opt_type)s", "%(config_name)s", "%(param)s", "%(value)s")
"""

UPDATE = """
UPDATE rockerbox.opt_config 
SET {}
WHERE id = {}
"""

DELETE = """DELETE FROM rockerbox.opt_config WHERE {}"""

class OptConfigHandler(EditableBaseHandler):

    def initialize(self, reporting_db=None, api=None, db=None):
        self.db = reporting_db 
        self.api = api
        self.params = {}
        self.query = ""
        self.GET = GET
        
        self.col_settings = {
            "visible": [
                "id",
                "opt_type",
                "config_name",
                "param",
                "value",
                "last_update",
                "active"
            ],
            "editable": [
                "opt_type",
                "param",
                "value",
                "config_name",
                "active",
                "advertiser"
            ],
            "filterable": [
                "opt_type",
                "config_name",
                "param",
                "value",
                "active"
            ],
            "insertable": [
                "opt_type",
                "config_name",
                "param",
                "value"
            ]
        }

    def post(self):
        print self.request.body
        pk = self.get_argument("pk", False)

        try:
            if pk:
                query = self.make_update(UPDATE, pk)
                self.update(query)
            else:
                query = self.make_insert()
                self.update(query)
                self.get()
                
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            o = Convert.df_to_json(data)
            print o
            self.render(
                "admin/editable.html", 
                data=o, 
                query=self.query,
                cols=json.dumps(self.col_settings["visible"]), 
                editable=json.dumps(self.col_settings["editable"]),
                insertable=json.dumps(self.col_settings["insertable"])
            )
        yield default, (data,)

    @tornado.web.asynchronous
    def get(self,*args):
        formatted = self.get_argument("format", False)

        for col in self.col_settings["filterable"]:
            self.params[col] = self.get_argument(col, False)
        query = self.make_query(GET)
        
        if formatted:
            self.get_data(query)
        else:
            self.get_content(pandas.DataFrame())

    def make_insert(self):
        print self.request.body

        for col in self.col_settings["insertable"]:
            self.params[col] = self.get_argument(col, False)

        if '' in self.params.values():
            raise Exception("Missing one or more parameters")

        return INSERT % self.params
