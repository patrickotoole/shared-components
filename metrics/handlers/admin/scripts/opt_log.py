import logging
import tornado.web
import ujson
import time
from twisted.internet import defer

from lib.helpers import *

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
    (rule_group_id, object_modified, campaign_id, profile_id, field_name, field_old_value, field_new_value) 
VALUES 
    (%(rule_group_id)s, "%(object_modified)s", %(campaign_id)s, %(profile_id)s, "%(field_name)s", "%(field_old_value)s", "%(field_new_value)s")
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
            "campaign_id",
            "field_name",
            "field_old_value", 
            "field_new_value",
            "rule_group_id"
            ]

        self.value_cols = [
            "metric_values"
            ]


    def get_lock(self, object_type, object_id):        
        """We need to implement this!"""
        pass

    @decorators.deferred
    @decorators.rate_limited
    def get_campaigns(self, campaign_ids):
        print "In get campaigns"
        if len(campaign_ids) == 1:
            url = "/campaign?id={}".format(campaign_ids[0])
        else:
            url = "/campaign?id={}".format(','.join(campaign_ids))
        r = self.api.get(url)
        return r.json

    @decorators.deferred
    @decorators.rate_limited
    def get_profile(self, profile_id):
        url = "/profile?id={}".format(profile_id)
        r = self.api.get(url)
        return r.json

    @decorators.deferred
    @decorators.rate_limited
    def edit_campaign(self, campaign_id, data=None, profile_data=None, profile_id=None):
        '''Edit a campaign.
        '''
        url = "/campaign?id={}".format(campaign_id)
        r = self.api.put(url, data=ujson.dumps({"campaign": data}))
        return r.json

    @decorators.deferred
    @decorators.rate_limited
    def edit_profile(self, profile_id, data):
        url = "/profile?id={}".format(profile_id)
        r = self.api.put(url, data=ujson.dumps({"profile": data}))
        return r.json

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

            if succeeded is None:
                raise Exception("INSERT value query failed")

    def rule_exists(self, group_id):
        results = self.db.execute(GET_RULE.format(group_id))
        if results and results.data:
            return True
        else:
            return False

    def check_request(self, obj):
        # Make list of all relevant POSTed columns
        all_cols = [ i for i in self.log_cols + self.value_cols if i in obj.keys() ]

        # Check that the POSTed columns are correct
        if len(all_cols) != len(self.log_cols + self.value_cols):
            raise Exception("required columns: object_modified, campaign_id, " + 
                            "field_name, field_old_value, field_new_value, " + 
                            "metric_values, rule_group_id")

        # Check that the rule_group_id exists
        if not self.rule_exists(obj["rule_group_id"]):
            raise Exception("rule_group_id {} does not exist".format(obj["rule_group_id"]))        

        if obj["object_modified"] not in ["campaign_profile", "campaign"]:
            raise Exception("object_modified field must be one of " + 
                            "[campaign, campaign_profile]")

    def assert_field_val(self, obj, field, value):
        if type(obj[field]) is list:
            obj[field].sort()
            value.sort()

        if not (str(obj[field]) == str(value)):
            raise Exception("current field value in AppNexus does not match " +
                            "field_old_value. {} != {}".format(obj[field], value))

    def log_changes(self, obj):
        # Pull out metric values
        values = obj["metric_values"]

        # Try to insert the log data. If it succeeds, insert the values data
        value_group_id = self.db.execute(INSERT % obj)

        if value_group_id:
            try:
                self.insert_values(value_group_id, values)
            except Exception as e:
                # If the values query fails, roll back
                self.db.execute(DELETE.format(value_group_id))
                self.db.execute(DELETE_VALUES.format(value_group_id))
                raise Exception("Value Query failed during execution: {}".format(e))
        else:
            raise Exception("Query {} failed during execution".format(INSERT % obj))

        new_log = self.db.select_dataframe(GET_ID.format(value_group_id))
        as_dict = Convert.df_to_values(new_log)
        self.get_content(as_dict)

    @defer.inlineCallbacks
    def push_to_appnexus(self, body):
        # Get POSTed data
        obj = ujson.loads(body)

        try:
            # Ensure that the request is formatted correctly and 
            # contains all necessary fields.
            self.check_request(obj)

            # Get the profile_id for the campaign
            campaign_data = yield self.get_campaigns([obj["campaign_id"]])
            obj["profile_id"] = campaign_data["response"]["campaign"]["profile_id"]

            # Get ids
            campaign_id = obj["campaign_id"]
            profile_id = obj["profile_id"]

            # Get field name and value
            field_name = obj["field_name"]
            field_val = obj["field_new_value"]
            expected_val = obj["field_old_value"]

            # Construct an object with the field to be changed
            changes = {field_name : field_val}

            # Check if field_old_value matches what we find in AppNexus object
            # If so, make the changes to the campaign/profile
            if obj["object_modified"] == "campaign_profile":
                profile = yield self.get_profile(profile_id)
                self.assert_field_val(profile["response"]["profile"], 
                                      field_name, expected_val)
                response = yield self.edit_profile(profile_id, changes)

            elif obj["object_modified"] == "campaign":
                campaign = yield self.get_campaigns([campaign_id])
                self.assert_field_val(campaign["response"]["campaign"], 
                                      field_name, expected_val)
                response = yield self.edit_campaign(campaign_id, changes)

            # Now that we made the changes in Appnexus, log them out.
            self.log_changes(obj)

        # If we hit an exception, send a JSON response back with the error
        except Exception as e:
            self.get_content(str(e), status="error")

    
    def get_content(self, response, status="ok"):
        self.write(ujson.dumps({"response": response, "status": status}))
        self.finish()

    @tornado.web.asynchronous
    def post(self):
        try:
            self.push_to_appnexus(self.request.body)
        except Exception, e:
            self.get_content(str(e), status="error")
