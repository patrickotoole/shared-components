import pandas
import ujson
from lib.helpers import decorators
import lib.zookeeper.zk_endpoint as zke
import logging


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

    def construct_action(self,advertiser, vendor,action_id):
        if vendor:
            where = "active = 1 and deleted = 0 and pixel_source_name = '%s' and action_type = '%s'" % (format(advertiser), format(vendor))
            return where
        if action_id:
            where = ""
            return where
        where = "active = 1 and deleted=0 and pixel_source_name = '{}'".format(advertiser)
        return where

    def query_action(self, advertiser, vendor=None, action_id=None):
        where = self.construct_where(advertiser,venodr, action_id) 
        result = self.db.select_dataframe(GET % {"where":where})
        patterns = self.get_patterns(result.action_id.tolist())
        return result, patterns

    def has_filter(self,ids):
        where = "action_id in (%s)" % ",".join(map(str,ids))
        patterns = self.db.select_dataframe(HAS_FILTER % {"where":where}).set_index("action_id")
        return patterns

    def get_subfilters(self, result):
        subfilters = self.db.select_dataframe(GETFILTERS % ",".join(result.action_id.apply(lambda x : str(x)).tolist()))
        subfilters = subfilters.groupby('action_id')['filter_pattern'].apply(list)
        return subfilters

    def get_parameters(self,advertiser, action_id=None):
        where_parameters = "advertiser = '{}'".format(advertiser)
        parameters = self.crushercache.select_dataframe(GET_PARAMETERS % {"where":where_parameters})
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
            advertiser_ids = 0

        return advertiser_ids==1, advertiser, urls

    def update_subfilters(self, action_id, subfilters):
        #Update subfilters
        if subfilters:
            all_subfilters = []
            for subfilter in subfilters:
                base_string = "('{}','{}')"
                all_subfilters.append(base_string.format(action_id, subfilter))
            INSERT_SUBFILTER_FULL = INSERT_SUBFILTER.format(",".join(all_subfilters))
            cursor.execute(INSERT_SUBFILTER_FULL)
