import tornado.web
import ujson
import pandas
import logging
import StringIO
import zlib, codecs

from handlers.base import BaseHandler
import lib.custom_defer as custom_defer
from lib.helpers import Convert
from twisted.internet import defer
from lib.helpers import decorators

DOMAINS = "SELECT domain, count FROM action_dashboard_cache WHERE url_pattern = '%s' and advertiser = '%s'"
DOMAINS_DATE = "SELECT domain, count FROM domains_cache WHERE url_pattern = '%s' and advertiser = '%s' and record_date='%s'"
DOMAINS_FILTER = "SELECT zipped FROM cache_domains_w_filter_id WHERE url_pattern = '%s' and advertiser = '%s' and filter_id = '%s'"
CATEGORIES = "SELECT c.domain, c.category_name, p.parent_category_name FROM domain_category c JOIN category p ON c.category_name = p.category_name where c.domain in (%s)"
DATE_FALLBACK = "select distinct record_date from domains_cache where url_pattern='{}' and advertiser='{}' order by record_date DESC"

class ActionDashboardHandler(BaseHandler):
    def initialize(self, db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache = crushercache

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


    def get_one_filter_id(self, url_pattern, advertiser, action_id):
        zipped_data = self.crushercache.select_dataframe(DOMAINS_FILTER % (url_pattern,advertiser, action_id))
        decode_data = codecs.decode(zipped_data.ix[0]['zipped'], 'hex')
        final_data =zlib.decompress(decode_data)
        return final_data

    @decorators.deferred
    def defer_get_actions(self, advertiser, number, action_type, url_pattern, filter_date=False):
        if filter_date:
            seg_data = self.crushercache.select_dataframe(DOMAINS_DATE % (url_pattern,advertiser, filter_date))
        else:
            import datetime
            now = datetime.datetime.now()- datetime.timedelta(days=1)
            now_date = now.strftime('%Y-%m-%d')
            seg_data = self.crushercache.select_dataframe(DOMAINS_DATE % (url_pattern,advertiser, now_date))
            if len(seg_data)==0:
                datefallback = self.crushercache.select_dataframe(DATE_FALLBACK.format(url_pattern, advertiser))
                if len(datefallback) >0:
                    now_date = str(datefallback['record_date'][0])
                    seg_data = self.crushercache.select_dataframe(DOMAINS_DATE % (url_pattern,advertiser, now_date))
        categories = self.get_idf(self.db, list(set(seg_data.domain)))
        joined = seg_data.merge(categories,on="domain")
        seg_data = joined.fillna(0)
        return seg_data

    @custom_defer.inlineCallbacksErrors
    def get_actions(self, advertiser, number, action_type, url_pattern, action_id=False, filter_date=False):
        try:
            if action_id:
                seg_data = self.get_one_filter_id(url_pattern, advertiser, action_id)
                self.write(seg_data)
                self.finish()
            else:
                actions = yield self.defer_get_actions(advertiser,number, action_type,url_pattern, filter_date)
                if len(actions) ==0:
                    self.set_status(400)
                    self.write(ujson.dumps({"error":str(Exception("No Data"))}))
                    self.finish()
                else:
                    versioning = self.request.uri
                    if versioning.find('v1') >=0:
                        if type(actions) == type(pandas.DataFrame()):
                            seg_data = {"domains": Convert.df_to_values(actions)}
                            self.write(ujson.dumps(seg_data))
                            self.finish()
                        else:
                            self.get_content_v1(actions)
                    else:
                        summary = self.summarize(actions)
                        self.get_content_v2(actions, summary)
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
        filter_id = self.get_argument("filter_id", False)
        filter_date = self.get_argument("date",False)
        
        self.get_actions(ad,limit, action_type, url_pattern, filter_id, filter_date)
	
