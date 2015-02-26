import tornado.web
import ujson
from lib.helpers import Convert

GET = "SELECT * FROM opt_log"

GET_ID = """
SELECT * 
FROM opt_log 
WHERE value_group_id={}
"""

GET_RULE = """
SELECT rule_group_id
FROM opt_rules
WHERE rule_group_id={} 
"""

INSERT = """
INSERT INTO opt_log 
    (rule_group_id, object_modified, object_id, field_name, field_old_value, field_new_value) 
VALUES 
    (%(rule_group_id)s, "%(object_modified)s", %(object_id)s, "%(field_name)s", "%(field_old_value)s", "%(field_new_value)s")
"""

INSERT_VALUE = """
INSERT INTO opt_values
    (value_group_id, metric_name, metric_value)
VALUES
    (%(value_group_id)s, "%(metric_name)s", "%(metric_value)s")
"""

DELETE = """
DELETE FROM opt_log
WHERE value_group_id={}
"""

DELETE_VALUES = """
DELETE FROM opt_values
WHERE value_group_id={}
"""

class OptLogHandler(tornado.web.RequestHandler):

    def initialize(self, reporting_db=None, api=None, db=None):
        self.db = reporting_db 
        self.api = api
        self.log_cols = [
            "object_modified",
            "object_id",
            "field_name",
            "field_old_value", 
            "field_new_value",
            "rule_group_id"
            ]

        self.value_cols = [
            "metric_values"
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

    def insert_values(self, group_id, values):
        for (metric, value) in values.iteritems():
            value_obj = {
                "value_group_id": group_id, 
                "metric_name": metric, 
                "metric_value": value
             }

            # For some reason this won't error out on failure unless we try to 
            # access the data
            succeeded = self.db.execute(INSERT_VALUE % value_obj)
            print succeeded
            if succeeded is None:
                raise Exception("INSERT value query failed")

    def rule_exists(self, group_id):
        results = self.db.execute(GET_RULE.format(group_id))
        if results and results.data:
            return True
        else:
            return False

    def make_to_insert(self,body):
        # Get POSTed data
        obj = ujson.loads(body)

        # Make list of all relevant POSTed columns
        all_cols = [ i for i in self.log_cols + self.value_cols if i in obj.keys() ]

        # Check that the POSTed columns are correct
        if len(all_cols) != len(self.log_cols + self.value_cols):
            raise Exception("required_columns: object_modified, object_id, " + 
                            "field_name, field_old_value, field_new_value, " + 
                            "metric_values, rule_group_id")

        # Check that the rule_group_id exists
        if not self.rule_exists(obj["rule_group_id"]):
            raise Exception("rule_group_id {} does not exist".format(obj["rule_group_id"]))

        # Create object with all columns
        log_obj = { i: obj[i] for i in self.log_cols }

        # Pull out metric values
        values = obj["metric_values"]

        # Try to insert the log data. If it succeeds, insert the values data
        value_group_id = self.db.execute(INSERT % log_obj)

        if value_group_id:
            try:
                self.insert_values(value_group_id, values)
            except Exception as e:
                # If the values query fails, roll back
                self.db.execute(DELETE.format(value_group_id))
                self.db.execute(DELETE_VALUES.format(value_group_id))
                raise Exception("Value Query failed during execution: {}".format(e))
        else:
            raise Exception("Query {} failed during execution".format(INSERT % log_obj))

        return value_group_id

    def post(self):
        try:
            print self.request.body
            lastrowid = self.make_to_insert(self.request.body)
            res = self.db.select_dataframe(GET_ID.format(lastrowid))
            as_json = Convert.df_to_json(res)
            self.write(as_json)
        except Exception, e:
            self.write(str(e))
