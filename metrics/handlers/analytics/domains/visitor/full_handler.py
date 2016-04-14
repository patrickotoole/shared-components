import tornado.web
import ujson
import pandas
import StringIO
import logging

import re

from link import lnk
from ..user.full_handler import VisitDomainsFullHandler
from handlers.base import BaseHandler
from ...analytics_base import AnalyticsBase
from twisted.internet import defer, threads
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *
from ...search.cache.pattern_search_cache import PatternSearchCache
from ...search.pattern.base_visitors import VisitorBase
import lib.custom_defer as custom_defer

class VisitorDomainsFullHandler(VisitorBase):

    def initialize(self, db=None, cassandra=None, zookeeper=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.zookeeper = zookeeper

        self.DOMAIN_SELECT="select * from rockerbox.visitor_domains_full where uid = ?"
        self.limit = None

    def full_get_w_agg_in(self, uids, date_clause):
        # DUPLICATED CODE FROOM VisitDomainsFullHandler but MRO FAILS
        
        str_uids = [str(u) for u in uids]
        uids_split = "'%s'" % "','".join(str_uids)
        logging.info("Visit domains full prepping statement")
        urls = self.get_domains_use_futures(uids, date_clause)
        results = pandas.DataFrame(urls)
        def aggDF(row):
            return {"count":len(row), "uniques":len(set(row))}
        
        if len(results)>0:
            df = results.groupby(["url"])["uid"].apply(aggDF)
            #df = results.groupby(["domain"])["uid"].apply(aggDF)
            final_results = df.unstack(1).reset_index()
            logging.info("QAggCassFull")
        else:
            final_results = pandas.DataFrame()

        return final_results 


    @decorators.deferred
    def defer_get_onsite_domains(self, date, uids):
        
        dates = build_datelist(7)
            
        date_clause = self.make_date_clause("date",date,"","")

        unsorted_results = self.full_get_w_agg_in(uids, date_clause)
        results = unsorted_results.sort(columns=["uniques","count"], ascending=False)
        df = pandas.DataFrame(results)

        return df

 
    def get_idf(self,domain_set):
        QUERY = """
            SELECT p.*, c.parent_category_name 
            FROM reporting.pop_domain_with_category p 
            JOIN category c using (category_name) 
            WHERE domain in (%(domains)s)
        """

        domain_set = [i.encode("utf-8") for i in domain_set]
        domains = domains = "'" + "','".join(domain_set) + "'"

        return self.db.select_dataframe(QUERY % {"domains":domains})



    @custom_defer.inlineCallbacksErrors
    def get_onsite_domains(self, date, kind, advertiser, pattern):

        filter_id = self.get_argument("filter_id",False)
        NUM_DAYS = int(self.get_argument("num_days",2))
        NUM_USERS = int(self.get_argument("num_users",10000))

        if filter_id:
            ALLOW_SAMPLE = False
            response = {}
            args = [advertiser,pattern,build_datelist(NUM_DAYS),NUM_DAYS,response,ALLOW_SAMPLE,filter_id]
            kwargs = yield self.build_arguments(*args)
            uids = list(set(kwargs['uid_urls'].uid))
            
        else:
            dates = build_datelist(NUM_DAYS)
            data = yield threads.deferToThread(self.get_uids_from_cache,*[advertiser,pattern,dates])
            uids = list(set(pandas.DataFrame(data).uid))

        uids = uids[:NUM_USERS]

        response_data = yield self.defer_get_onsite_domains(date, uids)
        response_data['domain'] = response_data.url.map(lambda x: x.replace("http://","").replace("www.","").split("/")[0])

        # BAD: BLOCKING PROCESS
        idf = self.get_idf([i for i in set(list(response_data['domain'])) if len(i) < 25 ])
        response_data = response_data.merge(idf,on="domain",how="left")
        response_data['url'] = response_data.url.map(lambda x : x.encode('utf-8'))

        
        versioning = self.request.uri
        if versioning.find('v1') >=0:
            self.get_content_v1(response_data)
        else:
            summary = self.summarize(response_data)
            self.get_content_v2(response_data, summary)

    def make_date_clause(self, variable, date, start_date, end_date):
        params = locals()

        for i in ["date", "start_date", "end_date"]:
            params[i] = self.format_timestamp(params[i])

        if date:
            return "%(variable)s = '%(date)s'" % params
        elif start_date and end_date:
            return "%(variable)s >= '%(start_date)s' AND %(variable)s <= '%(end_date)s'" % params
        elif start_date:
            return "%(variable)s >= '%(start_date)s'" % params
        elif end_date:
            return "%(variable)s <= '%(end_date)s'" % params
        else:
            return ""
    
    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        formatted = self.get_argument("format", False)
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        kind = self.get_argument("kind", "")
        url_pattern = self.get_argument("url_pattern", "")
        user = self.current_advertiser_name

        date_clause = self.make_date_clause("date", date, start_date, end_date)
        self.get_onsite_domains( date_clause, kind, user, url_pattern)
