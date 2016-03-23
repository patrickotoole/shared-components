import tornado.web
import ujson
import pandas
import logging
import StringIO

from handlers.base import BaseHandler
import lib.custom_defer as custom_defer

from twisted.internet import defer
from lib.helpers import decorators

SQL_QUERY_1 = "select a.url_pattern, sum(count), action_type from action_dashboard_cache a join action b on a.action_id=b.action_id where advertiser = '%s' and b.action_type = '%s' group by url_pattern order by sum(count) desc limit %s"

SQL_QUERY_3 = "select a.domain, a.count, c.parent_category_name from action_dashboard_cache a left join domain_category b on a.domain=b.domain and a.advertiser='%s' and url_pattern like '%s' inner join category c on b.category_name = c.category_name"

SQL_QUERY_4 = "SELECT a.domain, a.count, c.category_name, c.parent_category_name FROM domain_category b right join (SELECT domain, count FROM action_dashboard_cache WHERE url_pattern = '%s' and advertiser = '%s') a ON a.domain = b.domain INNER JOIN category c ON c.category_name = b.category_name"

DOMAINS = "SELECT domain, count FROM action_dashboard_cache WHERE url_pattern = '%s' and advertiser = '%s'"
CATEGORIES = "SELECT c.domain, c.category_name, p.parent_category_name FROM domain_category c JOIN category p ON c.category_name = p.category_name where c.domain in (%s)"


class ActionDashboardHandler(BaseHandler):
    def initialize(self, db=None, **kwargs):
        self.db = db

    def get_idf(self,db,domain_set):
        QUERY = """
            SELECT p.*, c.parent_category_name 
            FROM reporting.pop_domain_with_category p 
            JOIN category c using (category_name) 
            WHERE domain in (%(domains)s)
        """

        domain_set = [i.encode("utf-8") for i in domain_set]
        domains = domains = "'" + "','".join(domain_set) + "'"

        return db.select_dataframe(QUERY % {"domains":domains})


    def get_one(self,url_pattern,advertiser):
        seg_data = self.db.select_dataframe(DOMAINS % (url_pattern,advertiser))
        categories = self.get_idf(self.db, list(set(seg_data.domain)))
        joined = seg_data.merge(categories,on="domain")

        seg_data = joined.fillna(0)
        return seg_data

    @decorators.deferred
    def defer_get_actions(self, advertiser, number, action_type, url_pattern):
        if not url_pattern:
            q1 = SQL_QUERY_1 % (advertiser, action_type, number)
            segments = self.db.select_dataframe(q1)
            data = {'domains':[]}
            logging.info("Starting domain cache with limit %s..." % int(number))
            for current_segment in segments.ix[:int(number)].iterrows():
                c_seg = current_segment[1]["url_pattern"]

                seg_data = self.get_one(c_seg, advertiser)

                current_data = seg_data.T.to_dict().values()
                to_append = {"key":current_segment[1]["url_pattern"], "action_type": current_segment[1]["action_type"], "values":current_data}
                data['domains'].append(to_append)
            logging.info("Finished domain cache with limit %s." % int(number))

            return data
        else:
            seg_data = self.get_one(url_pattern, advertiser)

            data = {
                "domains": 
                    seg_data.to_dict("records")
            }

            return data

    @custom_defer.inlineCallbacksErrors
    def get_actions(self, advertiser, number, action_type, url_pattern):
        try:
            actions = yield self.defer_get_actions(advertiser,number, action_type,url_pattern)
            if len(actions['domains']) ==0:
                import ipdb;ipdb.set_trace()
                self.set_status(400)
                self.write(ujson.dumps({"error":str(Exception("No Data"))}))
                self.finish()
            else:
                self.write(ujson.dumps(actions))
                self.finish()
        except:
            self.finish()
    
    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        ad = self.current_advertiser_name
        limit = self.get_argument("limit", 5)
        action_type = self.get_argument("action_type", "segment")
        url_pattern = self.get_argument("url_pattern", False)
        self.get_actions(ad,limit, action_type, url_pattern)
	
