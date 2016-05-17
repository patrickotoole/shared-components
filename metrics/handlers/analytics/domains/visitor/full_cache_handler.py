import tornado.web
import ujson
import pandas
import StringIO
import logging, codecs, zlib

import re

from link import lnk
from ..user.full_handler import VisitDomainsFullHandler
from handlers.base import BaseHandler
from ...analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
import lib.custom_defer as custom_defer
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *
from ...search.cache.pattern_search_cache import PatternSearchCache

QUERY_DATE = "SELECT advertiser, url_pattern, uniques, count, url FROM domains_full_cache WHERE advertiser = '{}' and url_pattern = '{}' and record_date='{}'"
QUERYFILTER = "select domain from filtered_out_domains where advertiser = '{}' or advertiser is NULL"
QUERY2 = "select advertiser, url_pattern, uniques, count, url FROM domains_full_cache_id WHERE advertiser = '{}' and url_pattern = '{}' and record_date='{}' and filter_id={}"
DATE_FALLBACK = "select distinct record_date from domains_full_cache where url_pattern='{}' and advertiser='{}' order by record_date DESC"

class VisitorDomainsFullCacheHandler(PatternSearchCache,VisitDomainsFullHandler):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache = crushercache

    def now(self):
        from datetime import datetime
        today = datetime.today()
        return str(today).split(".")[0]

    def getSummary(self, url_set):
        QUERY = """
            select title, summary, url
            from full_url_summary
            where url in (%(url)s)
        """
        escape = self.db.escape_string
        url_set = [escape(i) for i in url_set][:10000]
        url = "'" + "','".join(url_set) + "'"

        return self.crushercache.select_dataframe(QUERY % {"url":url})
     
    def get_idf(self,domain_set):
        QUERY = """
            SELECT p.domain, max(p.num_users) as num_users, p.idf, p.category_name, c.parent_category_name 
            FROM reporting.pop_domain_with_category p 
            JOIN category c using (category_name) 
            WHERE domain in (%(domains)s)
            group by domain
        """
        escape = self.db.escape_string  
        domain_set = [escape(i) for i in domain_set][:10000]
        domains = domains = "'" + "','".join(domain_set) + "'"

        return self.db.select_dataframe(QUERY % {"domains":domains})


    def queryCache(self, advertiser, pattern, top_count, filter_date=False):
        results = self.crushercache.select_dataframe(QUERY_DATE.format(advertiser, pattern, filter_date))
        return results

    def getRecentDate(self, pattern, advertiser):
        datefallback = self.crushercache.select_dataframe(DATE_FALLBACK.format(pattern, advertiser))
        now_date = str(datefallback['record_date'][0])
        return now_date

    @decorators.deferred
    def defer_get_onsite_cache(self, advertiser, pattern, top_count, filter_date=False):
        now_date = filter_date
        if not now_date:
            now_date = self.now()
        results = self.queryCache(advertiser, pattern, top_count, now_date)
        if len(results)==0 and not filter_date:
            now_date = self.getRecentDate(pattern, advertiser)
            results = self.queryCache(advertiser, pattern, top_count, now_date)
        results = results.fillna(0)
        sort_results = results.sort(["uniques", "count"], ascending=False)
        results_no_NA = sort_results[sort_results["url"] != "NA"]
        df = pandas.DataFrame(results_no_NA.iloc[:int(top_count)])
        return df

    @decorators.deferred
    def defer_get_onsite_cache_filter_id(self, advertiser, pattern, top_count, action_id):
        results  = self.crushercache.execute(QUERY2.format(action_id))
        compressed_results = codecs.decode(results.data[0][0], 'hex')
        df = zlib.decompress(compressed_results)
        return df

    @custom_defer.inlineCallbacksErrors
    def get_cache_domains(self, advertiser, pattern, top_count, filter_id, filter_date):
        if filter_id:
            response_data = yield self.defer_get_onsite_cache_filter_id(advertiser, pattern, top_count, filter_id)
            self.write(response_data)
            self.finish()
        else:
            response_data = yield self.defer_get_onsite_cache( advertiser, pattern, top_count, filter_date)
            response_data['domain'] = response_data.url.map(lambda x: x.replace("http://","").replace("www.","").split("/")[0])
            
            # BAD: BLOCKING PROCESS
            idf = self.get_idf(set(list(response_data['domain'])))
            summary = self.getSummary(set(list(response_data['url'])))
            response_data = response_data.merge(idf,on="domain",how="left")
            response_data = response_data.merge(summary, on="url", how="left")
            
            filter_out = self.crushercache.select_dataframe(QUERYFILTER.format(advertiser))
            remove_domains = set(filter_out.domain.tolist())
            filter_domain = response_data.domain.map(lambda x : x not in remove_domains)
            response_data = response_data[filter_domain]

            if len(response_data)>0:
                versioning = self.request.uri
                if versioning.find('v1') >=0:
                    self.get_content_v1(response_data)
                else:
                    summary = self.summarize(response_data)
                    self.get_content_v2(response_data, summary)
            else:
                self.set_status(400)
                self.write(ujson.dumps({"error":str(Exception("No Data"))}))
                self.finish()
    
    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        formatted = self.get_argument("format", False)
        url_pattern = self.get_argument("url_pattern", "")
        user = self.current_advertiser_name
        top_count = self.get_argument("top", 50)
        filter_id = self.get_argument("filter_id", False)
        filter_date = self.get_argument("date",False)

        self.get_cache_domains( user, url_pattern, top_count, filter_id, filter_date)
