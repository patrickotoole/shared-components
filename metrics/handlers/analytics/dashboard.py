import tornado.web
import ujson
import pandas
import logging
import StringIO

from ..base import BaseHandler

from twisted.internet import defer
from lib.helpers import decorators

SQL_QUERY_1 = "select action_name, sum(count) from action_dashboard_cache where advertiser = '%s' group by action_name order by sum(count) desc limit %s"

SQL_QUERY_3 = "select a.domain, a.count, c.parent_category_name from action_dashboard_cache a left join domain_category b on a.domain=b.domain and a.advertiser='%s' and action_name like '%s' inner join category c on b.category_name = c.category_name"

class ActionDashboardHandler(BaseHandler):
	def initialize(self, db=None, **kwargs):
		self.db = db

	@decorators.deferred
	def defer_get_actions(self, advertiser, number):
		q1 = SQL_QUERY_1 % (advertiser, number)
		segments = self.db.select_dataframe(q1)
		data = {'domains':[]}
		for current_segment in segments.ix[:number].iterrows():
			c_seg = current_segment[1]["action_name"]
			q2 = SQL_QUERY_3 % (advertiser, c_seg)
			seg_data = self.db.select_dataframe(q2)
			seg_data = seg_data.fillna(0)
			current_data = seg_data.T.to_dict().values()
			to_append = {"key":current_segment[1]["action_name"], "values":current_data}
			data['domains'].append(to_append)
		return data

	@defer.inlineCallbacks
	def get_actions(self, advertiser, number):
		try:
			actions = yield self.defer_get_actions(advertiser,number)
			self.write(ujson.dumps(actions))
			self.finish()
		except:
			self.finish()
	@tornado.web.authenticated
	@tornado.web.asynchronous
	def get(self):
		ad = self.current_advertiser_name
		limit = self.get_argument("limit", False)
		self.get_actions(ad,limit)

	
