import pandas
import ujson
from lib.helpers import decorators
import lib.zookeeper.zk_endpoint as zke
import logging

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

GET_MAX_ACTION_PLUS_1 = "select max(action_id)+1 from action"

RESET_AUTO_INCR_ACTION = "alter table action auto_increment = %s"

SQL_PATTERN_QUERY = "select url_pattern from action_patterns where action_id = '{}'"

SQL_NAME_QUERY= "select pixel_source_name from action where action_id = '{}'"

SQL_ACTION_QUERY = "select a.action_id, a.pixel_source_name from action a join action_patterns b on a.action_id=b.action_id where b.url_pattern = '{}' and a.pixel_source_name = '{}'"

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

    def _insert_zookeeper_tree(self, zookeeper, action):
        zk = zke.ZKEndpoint(zookeeper,tree_name=action["zookeeper_tree"])
        for url in action["url_pattern"]:
            updated_tree = zk.add_advertiser_pattern(action["advertiser"],url,zk.tree)
        zk.set_tree()

    def _insert_database(self, action, cursor):
        cursor.execute(INSERT_ACTION % action)
        action_id = cursor.lastrowid
        for url in action["url_pattern"]:
            pattern = self.make_pattern_object(action_id,url)
            cursor.execute(INSERT_ACTION_PATTERNS % pattern)
        action['action_id'] = action_id

    def _insert_work_queue(self, action, zookeeper):
        import work_queue
        import lib.cassandra_cache.run as cache
        import pickle
        import datetime

        #added to previous code from pattern search end point search_base
        pattern = action["url_pattern"]

        today = datetime.datetime.now()
        children = zookeeper.get_children("/active_pattern_cache")
        child = action["advertiser"] + "=" + pattern[0].replace("/","|")

        if child in children:
            pass
        else:
            self.zookeeper.ensure_path("/active_pattern_cache/" + child)

            for i in range(0,21):
                delta = datetime.timedelta(days=i)
                _cache_date = datetime.datetime.strftime(today - delta,"%Y-%m-%d")
                work = pickle.dumps((
                        cache.run_backfill,
                        [action["advertiser"],pattern[0],_cache_date,_cache_date + " backfill"]
                        ))
                work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,i)


    @decorators.multi_commit_cursor
    def perform_update(self,body,zookeeper,cursor=None):
        action = ujson.loads(body)
        self.assert_required_params(["id"])
        action_id = self.get_argument("id")

        #Delete record from tree and then insert with update
        #treeName = self.get_argument("zookeeper_tree","for_play")
        treeName = self.get_argument("zookeeper_tree","/kafka-filter/tree/visit_events_tree")
        zk = zke.ZKEndpoint(zookeeper, treeName)
        #Delete
        urls = self.db.select_dataframe(SQL_PATTERN_QUERY.format(action_id))
        advertiser = self.db.select_dataframe(SQL_NAME_QUERY.format(action_id))
        if len(urls) >0 and len(advertiser) > 0:
            urls = urls.ix[0][0]
            advertiser = advertiser.ix[0][0]
            advertiser_ids = self.db.select_dataframe(SQL_ACTION_QUERY.format(urls, advertiser))
        try:
            if len(advertiser_ids)==1:
                zk.remove_advertiser_children_pattern(advertiser, zk.tree, [urls])
                zk.set_tree()
        except:
            logging.error("url not in tree for advertiser %s" % ( advertiser))

        #insert
        try:
            zk = zke.ZKEndpoint(zookeeper,tree_name=action["zookeeper_tree"])
            for url in action["url_pattern"]:
                updated_tree = zk.add_advertiser_pattern(action["advertiser"],url,zk.tree)
                zk.set_tree()
        except:
            logging.error("could not add updated pattern to zookeeper try on put %s" % action)
        #Database Update
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
    def perform_delete(self,zookeeper,cursor=None):
        self.assert_required_params(["id"])

        action_id = self.get_argument("id")
        action = {"action_id":action_id}
        #action["zookeeper_tree"] = self.get_argument("zookeeper_tree","for_play")
        action["zookeeper_tree"] = self.get_argument("zookeeper_tree","/kafka-filter/tree/visit_events_tree")

        zk = zke.ZKEndpoint(zookeeper,tree_name=action["zookeeper_tree"])

        urls = self.db.select_dataframe(SQL_PATTERN_QUERY.format(action_id))
        advertiser = self.db.select_dataframe(SQL_NAME_QUERY.format(action_id))
        if len(urls) >0 and len(advertiser) > 0:
            urls = urls.ix[0][0]
            advertiser = advertiser.ix[0][0]
            advertiser_ids = self.db.select_dataframe(SQL_ACTION_QUERY.format(urls, advertiser))

        if len(advertiser_ids)==1:
            zk.remove_advertiser_children_pattern(advertiser, urls, zk.tree)
            zk.set_tree()
        
        cursor.execute(DELETE_ACTION % action)
        cursor.execute(DELETE_ACTION_PATTERN % action)

        return action

    @decorators.multi_commit_cursor
    def perform_insert(self, body, zookeeper,cursor=None):
        
        action = ujson.loads(body)
        action = dict(action.items() + [("start_date","0"),("end_date","0")])
        if action.get("operator") is None:
            action = dict(action.items() + [("operator", "or")])

        self.assert_not_present(action,["action_id"])

        action["advertiser"] = action.get("advertiser",self.current_advertiser_name)

        self.assert_required(action,self.required_cols)

        action["zookeeper_tree"] = self.get_argument("zookeeper_tree","/kafka-filter/tree/visit_events_tree")
        #action["zookeeper_tree"] = self.get_argument("zookeeper_tree","for_play")
        try:
            self._insert_zookeeper_tree(zookeeper, action)
            self._insert_database(action, cursor)

            if zookeeper:
                self._insert_work_queue(action,zookeeper)
            
            return action
        except Exception as e:
            next_auto = cursor.execute(GET_MAX_ACTION_PLUS_1)
            cursor.execute(RESET_AUTO_INCR_ACTION % next_auto)
            raise e
