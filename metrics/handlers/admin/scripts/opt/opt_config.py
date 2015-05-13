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

class OptConfigHandler(tornado.web.RequestHandler):

    def initialize(self, reporting_db=None, api=None, db=None):
        self.db = reporting_db 
        self.api = api
        self.params = {}
        self.query = ""
        
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
            ]
        }

    def get_query(self):
        where = self.make_where()
        if not where:
            where = "1=1"
        self.query = GET.format(where)
        return self.query

    def post(self):
        pk = self.get_argument("pk", False)

        try:
            if pk:
                query = self.make_update(pk)
                self.update(query)
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))

    def make_update(self, pk):
        print self.request.body
        col_to_change = self.get_argument("name")
        value = self.get_argument("value")
        
        set_clause = '{} = "{}"'.format(col_to_change, value)

        return UPDATE.format(set_clause, pk)

    def make_where(self):
        # If no params, just return a placeholder
        if not self.params:
            return "1=1"

        where = ['{} = "{}"'.format(k, v) for (k,v) in self.params.iteritems() if v]
        return ' and '.join(where)

    def respond(self):
        def default(self):
            self.write("Something")
        yield default

    @defer.inlineCallbacks
    def update(self, query):
        yield execute_mysql_deferred(self.db, query)
        self.respond()

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
                editable=json.dumps(self.col_settings["editable"])
            )
        yield default, (data,)

    @defer.inlineCallbacks
    def get_data(self, query):
        df = yield run_mysql_deferred(self.db, query)
        self.get_content(df)

    @tornado.web.asynchronous
    def get(self,*args):
        formatted = self.get_argument("format", False)

        for col in self.col_settings["filterable"]:
            self.params[col] = self.get_argument(col, False)
        query = self.get_query()
        
        if formatted:
            self.get_data(query)
        else:
            self.get_content(pandas.DataFrame())

    # def make_to_insert(self,body):

    #     # Get POSTed data
    #     obj = ujson.loads(body)

    #     # Make list of all relevant POSTed columns
    #     all_cols = [ i for i in self.required_cols if i in obj.keys() ]

    #     # Check that the POSTed columns are correct
    #     if len(all_cols) != len(self.required_cols):
    #         raise Exception("required_columns: script_name, campaign_id")

    #     script_name = obj["script_name"]
    #     campaign_id = obj["campaign_id"]

    #     try:
    #         new_row = {"script_name": script_name, "campaign_id": campaign_id}
    #         self.db.execute(INSERT % new_row)
    #         print (INSERT % new_row)
        
    #     except Exception as e:
    #         # Roll back any changes that might have occurred
    #         raise Exception("Error during INSERT execution: {}".format(e))
    
    #     return self.get_row(script_name, campaign_id)
