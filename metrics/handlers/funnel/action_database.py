import pandas
import ujson
from lib.helpers import decorators
import lib.zookeeper.zk_endpoint as zke
import logging

GET = """
SELECT pixel_source_name as advertiser, action_name, action_id, action_type, featured from action where %(where)s
"""

GETFILTERS = """
SELECT action_id, filter_pattern from action_filters where action_id in (%s)
"""

GET_PATTERNS = """
SELECT *  from action_patterns where %(where)s
"""

HAS_FILTER = """
SELECT distinct action_id, 1 has_filter from action_filters where %(where)s
"""

GET_PARAMETERS = """
SELECT filter_id as action_id, parameters from advertiser_udf_parameter where %(where)s
"""

INSERT_ACTION = """
INSERT INTO action
    (start_date, end_date, operator, pixel_source_name, action_name, action_type, featured)
VALUES
    ("%(start_date)s", "%(end_date)s", "%(operator)s", "%(advertiser)s", "%(action_name)s", "%(action_type)s", "%(featured)d")
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
UPDATE action set deleted=1 where action_id = %(action_id)s
"""

GET_MAX_ACTION_PLUS_1 = "select max(action_id)+1 from action"

RESET_AUTO_INCR_ACTION = "alter table action auto_increment = %s"

SQL_PATTERN_QUERY = "select url_pattern from action_patterns where action_id = '{}'"

SQL_NAME_QUERY= "select pixel_source_name from action where action_id = '{}'"

SQL_ACTION_QUERY = "select a.action_id, a.pixel_source_name from action a join action_patterns b on a.action_id=b.action_id where b.url_pattern = '{}' and a.pixel_source_name = '{}'"

INSERT_SUBFILTER = "insert into action_filters (action_id, filter_pattern) values {}"

from action_database_helpers import ActionDatabaseHelper

class ActionDatabase(ActionDatabaseHelper):

    def get_vendor_actions(self, advertiser, vendor):
        try:
            result, patterns = self.query_action(advertiser, vendor=vendor)
            joined = result.set_index("action_id").join(patterns)
            return joined.reset_index()
        except:
            return pandas.DataFrame()

    def get_advertiser_actions(self, advertiser):
        try:
            import ipdb; ipdb.set_trace()
            result, patterns = self.query_action(advertiser)
            joined = result.set_index("action_id").join(patterns)

            filters = self.has_filter(result.action_id.tolist())
            joined = joined.join(filters)

            parameters = self.get_parameters(advertiser)
            joined = joined.reset_index().merge(parameters, on="action_id").set_index("action_id")

            import ipdb; ipdb.set_trace()

            subfilters = self.get_subfilters(result)
            joined = joined.reset_index().merge(subfilters.reset_index(), on='action_id', how='left').set_index('action_id')

            return joined.reset_index()
        except:
            return pandas.DataFrame()

    def get_advertiser_action(self, advertiser, action_id):
        try:
            result, patterns = self.query_action(advertiser, action_id=action_id)
            joined = result.set_index("action_id").join(patterns)

            filters = self.has_filter(result.action_id.tolist())
            joined = joined.join(filters)

            subfilters = self.get_subfilters(result)
            joined = joined.reset_index().merge(subfilters.reset_index(), on='action_id').set_index('action_id')
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
    def perform_update(self,body,zookeeper,cursor=None):
        action = ujson.loads(body)
        self.assert_required_params(["id"])
        action_id = self.get_argument("id")

        #treeName = self.get_argument("zookeeper_tree","for_play")
        treeName = self.get_argument("zookeeper_tree","/kafka-filter/tree/visit_events_tree")
        zk = zke.ZKEndpoint(zookeeper, treeName)

        remove_from_zk, advertiser, url = self.zk_remove_check(action_id)

        if remove_from_zk:
            zk.remove_advertiser_children_pattern(advertiser, urls, zk.tree)
            zk.set_tree()

        #insert
        try:
            self._insert_zookeeper_tree(self, zk, action)
        except:
            logging.error("could not add updated pattern to zookeeper try on put %s" % action)

        subfilters = action.get('subfilters',False)
        if subfilters:
            action.pop('subfilters')
        if action.get("zookeeper_tree",False):
            action.pop("zookeeper_tree")

        action['fields'] = self.make_set_fields(action)
        cursor.execute(UPDATE_ACTION % action)
        
        to_add, to_remove = self.get_pattern_diff(action)

        for url in to_add:
            pattern = self.make_pattern_object(action_id, url)
            cursor.execute(INSERT_ACTION_PATTERNS % pattern)

        for url in to_remove:
            pattern = self.make_pattern_object(action_id, url)
            cursor.execute(DELETE_ACTION_PATTERNS % pattern)

        if len(to_add) == 1:
            self.update_subfilter(action_id, subfilters)

        return action

    @decorators.multi_commit_cursor
    def perform_delete(self,zookeeper,cursor=None):
        self.assert_required_params(["id"])
        action_id = self.get_argument("id")
        action = {"action_id":action_id}
        #action["zookeeper_tree"] = self.get_argument("zookeeper_tree","for_play")
        action["zookeeper_tree"] = self.get_argument("zookeeper_tree","/kafka-filter/tree/visit_events_tree")

        zk = zke.ZKEndpoint(zookeeper,tree_name=action["zookeeper_tree"])

        remove_from_zk, advertiser, url = self.zk_remove_check(action_id)
        
        if remove_from_zk:
            zk.remove_advertiser_children_pattern(advertiser, urls, zk.tree)
            zk.set_tree()

        cursor.execute(DELETE_ACTION % action)

        return action

    @decorators.multi_commit_cursor
    def perform_insert(self, body, zookeeper,cursor=None):

        action = ujson.loads(body)
        action = dict(action.items() + [("start_date","0"),("end_date","0")])
        if action.get("operator") is None:
            action = dict(action.items() + [("operator", "or")])

        self.assert_not_present(action,["action_id"])

        action["advertiser"] = action.get("advertiser",self.current_advertiser_name)
        action["action_type"] = action.get("action_type", "segment")

        self.assert_required(action,self.required_cols)

        action["zookeeper_tree"] = self.get_argument("zookeeper_tree","/kafka-filter/tree/visit_events_tree")
        #action["zookeeper_tree"] = self.get_argument("zookeeper_tree","for_play")
        zk = zke.ZKEndpoint(zookeeper,tree_name=action["zookeeper_tree"])

        try:
            self._insert_zookeeper_tree(zk, action)
            self._insert_database(action, cursor)

            if zookeeper:
                self._insert_work_queue(action,zookeeper)

            return action
        except Exception as e:
            next_auto = cursor.execute(GET_MAX_ACTION_PLUS_1)
            cursor.execute(RESET_AUTO_INCR_ACTION % next_auto)
            raise e
