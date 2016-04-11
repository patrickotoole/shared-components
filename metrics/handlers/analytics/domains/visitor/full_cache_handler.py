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

QUERY = "select advertiser, url_pattern, uniques, count, url from full_domain_cache_test where advertiser = '{}' and url_pattern = '{}'"
QUERY2 = "select zipped from cache_domains_full_w_filter_id where filter_id={}"

class VisitorDomainsFullCacheHandler(PatternSearchCache,VisitDomainsFullHandler):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache = crushercache
    
    def get_idf(self,domain_set):
        QUERY = """
            SELECT p.*, c.parent_category_name 
            FROM reporting.pop_domain_with_category p 
            JOIN category c using (category_name) 
            WHERE domain in (%(domains)s)
        """

        domain_set = [i.encode("utf-8").replace("'","") for i in domain_set]
        domains = domains = "'" + "','".join(domain_set) + "'"

        return self.db.select_dataframe(QUERY % {"domains":domains})


    @decorators.deferred
    def defer_get_onsite_cache(self, advertiser, pattern, top_count):

        results  = self.crushercache.select_dataframe(QUERY.format(advertiser, pattern))
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
    def get_cache_domains(self, advertiser, pattern, top_count, filter_id):
        if filter_id:
            response_data = yield self.defer_get_onsite_cache_filter_id(advertiser, pattern, top_count, filter_id)
            self.write(response_data)
            self.finish()
        else:
            response_data = yield self.defer_get_onsite_cache( advertiser, pattern, top_count)
            response_data['domain'] = response_data.url.map(lambda x: x.replace("http://","").replace("www.","").split("/")[0])

            # BAD: BLOCKING PROCESS
            idf = self.get_idf(set(list(response_data['domain'])))
            response_data = response_data.merge(idf,on="domain",how="left")


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

        self.get_cache_domains( user, url_pattern, top_count, filter_id)
