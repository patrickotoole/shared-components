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

SQL_PATTERN_QUERY = "select url_pattern from action_patterns where action_id = '{}'"

SQL_NAME_QUERY= "select pixel_source_name from action where action_id = '{}'"

SQL_ACTION_QUERY = "select a.action_id, a.pixel_source_name from action a join action_patterns b on a.action_id=b.action_id where b.url_pattern = '{}' and a.pixel_source_name = '{}'"

INSERT_SUBFILTER = "insert into action_filters (action_id, filter_pattern) values {}"

class ActionDatabaseHelper(object):

    def get_patterns(self,ids):
        where = "action_id in (%s)" % ",".join(map(str,ids))
        patterns = self.db.select_dataframe(GET_PATTERNS % {"where":where})
        grouped = patterns.groupby("action_id").agg(lambda x: x.T.to_dict().values())
        return grouped

    def has_filter(self,ids):
        where = "action_id in (%s)" % ",".join(map(str,ids))
        patterns = self.db.select_dataframe(HAS_FILTER % {"where":where}).set_index("action_id")
        return patterns

    def construct_where(self,advertiser, vendor,action_id):
        if vendor:
            where = "active = 1 and deleted = 0 and pixel_source_name = '%s' and action_type = '%s'" % (format(advertiser), format(vendor))
            return where
        if action_id:
            where = ""
            return where
        where = "active = 1 and deleted=0 and pixel_source_name = '{}'".format(advertiser)
        return where

    def query_action(self, advertiser, vendor=None, action_id=None):
        where = self.construct_where(advertiser,vendor, action_id) 
        result = self.db.select_dataframe(GET % {"where":where})
        patterns = self.get_patterns(result.action_id.tolist())
        return result, patterns

    def get_subfilters(self, result):
        subfilters = self.db.select_dataframe(GETFILTERS % ",".join(result.action_id.apply(lambda x : str(x)).tolist()))
        if len(subfilters) ==0:
            subfilters = pandas.DataFrame({"action_id":[], "filter_pattern":[]})
        else:
            subfilters = subfilters.groupby('action_id')['filter_pattern'].apply(list)
        return subfilters

    def get_parameters(self,advertiser, action_id=None):
        where_parameters = "advertiser = '{}'".format(advertiser)
        parameters = self.crushercache.select_dataframe(GET_PARAMETERS % {"where":where_parameters})
        if len(parameters)==0:
            parameters = pandas.DataFrame({"action_id":[], "parameters":[]})
        return parameters

    def _insert_zookeeper_tree(self, zk, action):
        for url in action["url_pattern"]:
            updated_tree = zk.add_advertiser_pattern(action["advertiser"],url,zk.tree)
        zk.set_tree()

    def _insert_database(self, action, cursor):
        cursor.execute(INSERT_ACTION % action)
        action_id = cursor.lastrowid
        if "subfilters" in action:
            all_subfilters = []
            for subfilter in action['subfilters']:
                base_string = "('{}','{}')"
                all_subfilters.append(base_string.format(action_id, subfilter))
            INSERT_SUBFILTER_FULL = INSERT_SUBFILTER.format(",".join(all_subfilters))
            cursor.execute(INSERT_SUBFILTER_FULL)
        for url in action["url_pattern"]:
            pattern = self.make_pattern_object(action_id,url)
            cursor.execute(INSERT_ACTION_PATTERNS % pattern)
        action['action_id'] = action_id

    def _insert_work_queue(self, action, zookeeper):
        from lib.zookeeper import CustomQueue
        import lib.cassandra_cache.run as cache
        import pickle
        import datetime

        #added to previous code from pattern search end point search_base
        pattern = action["url_pattern"]

        today = datetime.datetime.now()
        children = zookeeper.get_children("/active_pattern_cache")
        child = action["advertiser"] + "=" + pattern[0].replace("/","|")

        if child in children:
            logging.info("already exists")
        else:
            self.zookeeper.ensure_path("/active_pattern_cache/" + child)

            for i in range(0,21):
                delta = datetime.timedelta(days=i)
                _cache_date = datetime.datetime.strftime(today - delta,"%Y-%m-%d")
                work = pickle.dumps((
                        cache.run_backfill,
                        [action["advertiser"],pattern[0],_cache_date,_cache_date + " backfill"]
                        ))
                CustomQueue.CustomQueue(self.zookeeper,"python_queue","log", "v01", 0).put(work,i)


    def zk_remove_check(self, action_id):
        urls = self.db.select_dataframe(SQL_PATTERN_QUERY.format(action_id))
        advertiser = self.db.select_dataframe(SQL_NAME_QUERY.format(action_id))

        if len(urls) >0 and len(advertiser) > 0:
            urls = urls.ix[0][0]
            advertiser = advertiser.ix[0][0]
            advertiser_ids = self.db.select_dataframe(SQL_ACTION_QUERY.format(urls, advertiser))
        else:
            advertiser_ids = pandas.DataFrame()
        advertiser_ids_bool = True if len(advertiser_ids)==1 else False

        return advertiser_ids_bool, advertiser, urls

    def update_subfilters(self, action_id, subfilters):
        #Update subfilters
        if subfilters:
            all_subfilters = []
            for subfilter in subfilters:
                base_string = "('{}','{}')"
                all_subfilters.append(base_string.format(action_id, subfilter))
            INSERT_SUBFILTER_FULL = INSERT_SUBFILTER.format(",".join(all_subfilters))
            cursor.execute(INSERT_SUBFILTER_FULL)
