import tornado.web
import ujson
from lib.helpers import Convert

MAX_ID = """
SELECT max(rule_group_id)
FROM opt_rules
"""

GET = """
SELECT * 
FROM opt_rules
WHERE {}
"""

INSERT = """
INSERT INTO opt_rules 
    (rule_group_id, rule_group_name, rule) 
VALUES 
    (%(id)s, "%(rule_group_name)s", "%(rule)s")
"""

DEACTIVATE = """
UPDATE opt_rules
SET active=0
WHERE {} and active=1
"""

DELETE = """
DELETE FROM opt_rules
WHERE rule_group_id={}
"""

class OptRulesHandler(tornado.web.RequestHandler):

    def initialize(self, reporting_db=None, api=None, db=None):
        self.db = reporting_db 
        self.api = api

        self.required_cols = [
            "rule_group_name",
            "rules"
            ]

    def get_all(self, inactive):
        where = "1=1"
        if not inactive:
            where = where + " and active = 1"
        return self.db.select_dataframe(GET.format(where))       

    def get_id(self, id_str, inactive):
        where = "rule_group_id = {}".format(id_str)
        if not inactive:
            where = where + " and active = 1"
        return self.db.select_dataframe(GET.format(where))

    def get_name(self, name, inactive):
        where = "rule_group_name = '{}'".format(name)
        if not inactive:
            where = where + " and active = 1"
        return self.db.select_dataframe(GET.format(where))

    def get(self,*args):
        inactive = self.get_argument("inactive", False)
        if inactive == "false":
            inactive = False

        if len(args) > 0:
            rule_group_id = args[0]
            results = self.get_id(rule_group_id, inactive)

        elif self.get_argument("id", False):
            rule_group_id = self.get_argument("id")
            results = self.get_id(rule_group_id, inactive)

        elif self.get_argument("name", False):
            rule_group_name = self.get_argument("name")
            results = self.get_name(rule_group_name, inactive)

        else:
            results = self.get_all(inactive)

        as_json = Convert.df_to_json(results)
        self.write(as_json)
        self.finish()

    def get_new_id(self):
        new_id = self.db.execute(MAX_ID).data[0][0]

        if not new_id:
            new_id = 1
        else:
            new_id += 1

        return new_id

    def make_to_insert(self,body):

        # Get POSTed data
        obj = ujson.loads(body)

        # Make list of all relevant POSTed columns
        all_cols = [ i for i in self.required_cols if i in obj.keys() ]

        # Check that the POSTed columns are correct
        if len(all_cols) != len(self.required_cols):
            raise Exception("required_columns: rule_group_name, rules")

        new_id = self.get_new_id()
        rule_group_name = obj["rule_group_name"]
        rules = obj["rules"]

        try:
            # Insert each new rule
            for rule in rules:
                rule_obj = {"id": new_id, "rule_group_name": rule_group_name, "rule": rule}
                self.db.execute(INSERT % rule_obj)

            # Change all rules with this name and not this id to inactive
            where = "rule_group_name='{}' and rule_group_id!={}".format(rule_group_name, new_id)
            self.db.execute(DEACTIVATE.format(where))
        except Exception as e:
            # Roll back any changes that might have occurred
            self.db.execute(DELETE.format(new_id))
            raise Exception("Error during INSERT execution: {}".format(e))

        return self.db.select_dataframe(GET_ID.format(new_id))

    def post(self):
        try:
            data = self.make_to_insert(self.request.body)
            as_json = Convert.df_to_json(data)
            self.write(as_json)
        except Exception, e:
            self.write(str(e))
