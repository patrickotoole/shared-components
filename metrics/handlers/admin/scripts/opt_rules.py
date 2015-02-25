import tornado.web
import ujson
from lib.helpers import Convert

MAX_ID = """
SELECT max(rule_group_id)
FROM opt_rules
"""

GET = """
SELECT * FROM opt_rules
"""

GET_ID = """
SELECT * 
FROM opt_rules
WHERE rule_group_id = {}
"""

INSERT = """
INSERT INTO opt_rules 
    (rule_group_id, rule_group_name, rule) 
VALUES 
    (%(id)s, "%(rule_group_name)s", "%(rule)s")
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

    def get(self,*args):
        if len(args) > 0:
            decision_id = args[0]
            results = self.db.select_dataframe(GET_ID.format(decision_id))
            as_json = Convert.df_to_json(results)
        else:
            _all = self.db.select_dataframe(GET)
            as_json = Convert.df_to_json(_all)

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
            for rule in rules:
                rule_obj = {"id": new_id, "rule_group_name": rule_group_name, "rule": rule}
                self.db.execute(INSERT % rule_obj)
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
