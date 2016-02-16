import tornado.web
import ujson
import pandas
import logging
import StringIO

from ..base import BaseHandler

from twisted.internet import defer
from lib.helpers import decorators

SQL_QUERY_1 = "select a.url_pattern, sum(count), action_type from action_dashboard_cache a join action b on a.action_id=b.action_id where advertiser = '%s' and b.action_type = '%s' group by url_pattern order by sum(count) desc limit %s"

SQL_QUERY_3 = "select a.domain, a.count, c.parent_category_name from action_dashboard_cache a left join domain_category b on a.domain=b.domain and a.advertiser='%s' and url_pattern like '%s' inner join category c on b.category_name = c.category_name"

SQL_QUERY_4 = "select action_type from action where url_pattern = '%s'"

class ActionDashboardHandler(BaseHandler):
    def initialize(self, db=None, **kwargs):
        self.db = db

    @decorators.deferred
    def defer_get_actions(self, advertiser, number, action_type, url_pattern):
        if not url_pattern:
            q1 = SQL_QUERY_1 % (advertiser, action_type, number)
            segments = self.db.select_dataframe(q1)
            data = {'domains':[]}
            for current_segment in segments.ix[:int(number)].iterrows():
                c_seg = current_segment[1]["url_pattern"]
                q2 = SQL_QUERY_3 % (advertiser, c_seg)
                seg_data = self.db.select_dataframe(q2)
                seg_data = seg_data.fillna(0)
                current_data = seg_data.T.to_dict().values()
                to_append = {"key":current_segment[1]["url_pattern"], "action_type": current_segment[1]["action_type"], "values":current_data}
                data['domains'].append(to_append)
            return data
        else:
            data = {'domains':[]}
            q2 = SQL_QUERY_3 % (advertiser, url_pattern)
            a_type = self.db.select_dataframe(SQL_QUERY_4 % url_pattern)
            seg_data = self.db.select_dataframe(q2)
            seg_data = seg_data.fillna(0)
            current_data = seg_data.T.to_dict().values()
            to_append = {"key":url_pattern, "action_type" : a_type.ix[0]["action_type"], "values":current_data}
            data['domains'].append(to_append)
            return data

    @defer.inlineCallbacks
    def get_actions(self, advertiser, number, action_type, url_pattern):
        try:
            actions = yield self.defer_get_actions(advertiser,number, action_type,url_pattern)
            self.write(ujson.dumps(actions))
            self.finish()
        except:
            self.finish()
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        ad = self.current_advertiser_name
        limit = self.get_argument("limit", 5)
        action_type = self.get_argument("action_type", "segment")
        url_pattern = self.get_argument("url_pattern", False)
        self.get_actions(ad,limit, action_type, url_pattern)
	
