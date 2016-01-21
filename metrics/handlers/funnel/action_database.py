import pandas
import ujson
from lib.helpers import decorators

GET = """
SELECT pixel_source_name as advertiser, action_name, action_id, action_type from action where %(where)s
"""

GET_PATTERNS = """
SELECT *  from action_patterns where %(where)s
"""

INSERT_ACTION = """
INSERT INTO action
    (start_date, end_date, operator, pixel_source_name, action_name)
VALUES
    ("%(start_date)s", "%(end_date)s", "%(operator)s", "%(advertiser)s", "%(action_name)s")
"""

INSERT_ACTION_PATTERNS = """
INSERT INTO action_patterns (action_id, url_pattern)
VALUES (%(action_id)s, "%(url_pattern)s")
"""

UPDATE_ACTION = """
UPDATE action SET %(fields)s
WHERE action_id = %(action_id)s
"""

DELETE_ACTION_PATTERNS = """
DELETE FROM action_patterns where action_id = %(action_id)s and url_pattern = "%(url_pattern)s"
"""

DELETE_ACTION = """
DELETE FROM action where action_id = %(action_id)s
"""

DELETE_ACTION_PATTERN = """
DELETE FROM action_patterns where action_id = %(action_id)s
"""

class ActionDatabase(object):

    def get_patterns(self,ids):
        where = "action_id in (%s)" % ",".join(map(str,ids))
        patterns = self.db.select_dataframe(GET_PATTERNS % {"where":where})
        grouped = patterns.groupby("action_id").agg(lambda x: x.T.to_dict().values())
        return grouped

    def get_all(self):
        # this is no longer a thing...
        where = "1=1"
        result = self.db.select_dataframe(GET % {"where":where})
        patterns = self.get_patterns(result.action_id.tolist())
        joined = result.set_index("action_id").join(patterns)

        return joined.reset_index()

    def get_vendor_actions(self, advertiser, vendor):
        try:
            where = "pixel_source_name = '%s' and action_type = '%s'" % (format(advertiser), format(vendor))
            result = self.db.select_dataframe(GET % {"where":where})
            patterns = self.get_patterns(result.action_id.tolist())
            joined = result.set_index("action_id").join(patterns)
            return joined.reset_index()
        except:
            return pandas.DataFrame()

    def get_advertiser_actions(self, advertiser):
        try:
            where = "pixel_source_name = '{}'".format(advertiser)
            result = self.db.select_dataframe(GET % {"where":where})
            patterns = self.get_patterns(result.action_id.tolist())
            joined = result.set_index("action_id").join(patterns)

            return joined.reset_index()
        except:
            return pandas.DataFrame()

    def get_advertiser_action(self, advertiser, action_id):
        try:
            where = "pixel_source_name = '%s' and action_id = %s" % (advertiser,action_id)
            result = self.db.select_dataframe(GET % {"where":where})
            patterns = self.get_patterns(result.action_id.tolist())
            joined = result.set_index("action_id").join(patterns)

            return joined.reset_index()
        except:
            return pandas.DataFrame()

    def make_set_fields(self,action):
        # creates the update statement for an action
        excludes = ["action_id","url_pattern","advertiser"]
        fields = ", ".join(["%s=\"%s\"" % (i,j) for i,j in action.items() if not (i in excludes)])

        return fields

    def make_pattern_object(self,action_id,url):
        return {
            "action_id": action_id,
            "url_pattern": url
        }

    def get_pattern_diff(self,action):
        # calculates how the action patterns differ from the database patterns for action
        where = "action_id = %s" % action['action_id']
        existing_df = self.db.select_dataframe(GET_PATTERNS % {"where":where})
        existing_patterns = existing_df.url_pattern.tolist()

        to_remove_df = existing_df[~existing_df.url_pattern.isin(action["url_pattern"])]
        to_remove = to_remove_df.url_pattern.tolist()

        to_add = [url for url in action["url_pattern"] if str(url) not in existing_patterns]

        return (to_add,to_remove)


    @decorators.multi_commit_cursor
    def perform_update(self,body,cursor=None):
        action = ujson.loads(body)
        self.assert_required_params(["id"])
        action_id = self.get_argument("id")

        action['fields'] = self.make_set_fields(action)
        cursor.execute(UPDATE_ACTION % action)

        to_add, to_remove = self.get_pattern_diff(action)

        for url in to_add:
            pattern = self.make_pattern_object(action_id, url)
            cursor.execute(INSERT_ACTION_PATTERNS % pattern)

        for url in to_remove:
            pattern = self.make_pattern_object(action_id, url)
            cursor.execute(DELETE_ACTION_PATTERNS % pattern)

        return action

    @decorators.multi_commit_cursor
    def perform_delete(self,cursor=None):
        self.assert_required_params(["id"])

        action_id = self.get_argument("id")
        action = {"action_id":action_id}

        cursor.execute(DELETE_ACTION % action)
        cursor.execute(DELETE_ACTION_PATTERN % action)

        return action

    @decorators.multi_commit_cursor
    def perform_insert(self,body,cursor=None):

        action = ujson.loads(body)
        action = dict(action.items() + [("start_date","0"),("end_date","0")])
        if action.get("operator") is None:
            action = dict(action.items() + [("operator", "or")])

        self.assert_not_present(action,["action_id"])

        action["advertiser"] = action.get("advertiser",self.current_advertiser_name)

        self.assert_required(action,self.required_cols)

        cursor.execute(INSERT_ACTION % action)
        action_id = cursor.lastrowid

        for url in action["url_pattern"]:
            pattern = self.make_pattern_object(action_id,url)
            cursor.execute(INSERT_ACTION_PATTERNS % pattern)

        action['action_id'] = action_id

        return action
