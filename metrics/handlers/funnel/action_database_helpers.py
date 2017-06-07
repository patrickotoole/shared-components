import pandas
import ujson
from lib.helpers import decorators
import lib.zookeeper.zk_endpoint as zke
import logging


class ActionDatabaseHelper(object)

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

    def get_subfilters(self, result)
        subfilters = self.db.select_dataframe(GETFILTERS % ",".join(result.action_id.apply(lambda x : str(x)).tolist()))
        subfilters = subfilters.groupby('action_id')['filter_pattern'].apply(list)
        return subfilters

    def get_parameters(self,advertiser, action_id=None):
        where_parameters = "advertiser = '{}'".format(advertiser)
        parameters = self.crushercache.select_dataframe(GET_PARAMETERS % {"where":where_parameters})
        return parameters
