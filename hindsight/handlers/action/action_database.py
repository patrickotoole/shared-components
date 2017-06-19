import pandas
import ujson
from lib.helpers import decorators
import lib.zookeeper.zk_endpoint as zke
import logging


GET_PATTERNS = """
SELECT *  from action_patterns where %(where)s
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

UPDATE_ACTION_PATTERN = """
UPDATE action_patterns set url_pattern='%s' 
where action_id='%s'
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


from action_database_helpers import ActionDatabaseHelper

class ActionDatabase(ActionDatabaseHelper):

    def get_advertiser_actions(self, advertiser):
        try:
            result, patterns = self.query_action(advertiser)
            joined = result.set_index("action_id").join(patterns)

            filters = self.has_filter(result.action_id.tolist())
            joined = joined.join(filters)
            
            parameters = self.get_parameters(advertiser)
            joined = joined.reset_index().merge(parameters, on="action_id", how='left').set_index("action_id")
            joined['parameters'] = joined.parameters.fillna('{}')
            
            subfilters = self.get_subfilters(result)
            joined = joined.reset_index().merge(subfilters.reset_index(), on='action_id', how='left').set_index('action_id')

            return joined.reset_index()
        except Exception as e:
            logging.info(str(e))
            return pandas.DataFrame()

    def get_advertiser_action(self, advertiser, action_id):
        try:
            result, patterns = self.query_action(advertiser, action_id=action_id)
            joined = result.set_index("action_id").join(patterns)
            
            filters = self.has_filter(result.action_id.tolist())
            joined = joined.join(filters)

            parameters = self.get_parameters(advertiser)
            joined = joined.reset_index().merge(parameters, on="action_id", how='left').set_index("action_id")
            joined['parameters'] = joined.parameters.fillna('{}')

            subfilters = self.get_subfilters(result)
            joined = joined.reset_index().merge(subfilters.reset_index(), on='action_id', how='left').set_index('action_id')

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


    @decorators.multi_commit_cursor
    def perform_update(self,body,zookeeper,cursor=None):
        action = ujson.loads(body)
        self.assert_required_params(["id"])
        action_id = self.get_argument("id")

        logging.info("before delete")
        self._delete_from_tree(action['action_id'])
        #insert
        try:
            logging.info("pre insert")
            self._insert_into_tree (action['url_pattern'][0], action['advertiser'])
        except:
            logging.error("could not add updated pattern to tree try on put %s" % action)
        subfilters = action.get('subfilters',False)
        if subfilters:
            action.pop('subfilters')
        if action.get("zookeeper_tree",False):
            action.pop("zookeeper_tree")

        action['fields'] = self.make_set_fields(action)
        logging.info(action['fields'])
        cursor.execute(UPDATE_ACTION % action)
        cursor.execute(UPDATE_ACTION_PATTERN % (action['url_pattern'][0], action_id))
        if subfilters:    
            self.update_subfilters(action_id, subfilters)

        return action

    @decorators.multi_commit_cursor
    def perform_delete(self,zookeeper,cursor=None):
        self.assert_required_params(["id"])
        action_id = self.get_argument("id")
        action = {"action_id":action_id}
        #action["zookeeper_tree"] = self.get_argument("zookeeper_tree","for_play")
        #action["zookeeper_tree"] = self.get_argument("zookeeper_tree","/kafka-filter/tree/visit_events_tree")

        #zk = zke.ZKEndpoint(zookeeper,tree_name=action["zookeeper_tree"])

        self._delete_from_tree(action['action_id'])

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

        advertiser = action['advertiser']
        try:
            #self._insert_zookeeper_tree(zk, action)
            self._insert_into_tree(action['url_pattern'][0], advertiser)
            
            parameters = action.get('parameters',{})
            self._insert_database(action, cursor, parameters)
            
            return action
        except Exception as e:
            next_auto = cursor.execute(GET_MAX_ACTION_PLUS_1)
            cursor.execute(RESET_AUTO_INCR_ACTION % next_auto)
            raise e
