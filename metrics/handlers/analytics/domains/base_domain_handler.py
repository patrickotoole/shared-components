import tornado.web
import ujson
import pandas
import StringIO
import logging
import re
from lib.zookeeper.zk_pool import ZKPool

from link import lnk
from handlers.base import BaseHandler
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_cache.helpers import *
import lib.custom_defer as custom_defer
from base import  VisitDomainBase

from ..search.search_helpers import SearchCassandraHelpers
helpers = SearchCassandraHelpers

from lib.aho import AhoCorasick
import base_helpers as base_helpers
from handlers.base import BaseHandler
from handlers.analytics.analytics_base import AnalyticsBase
from lib.cassandra_helpers.range_query import CassandraRangeQuery

DETAILS_QUERY = "select max(ts) from crusher_cache_accounting where advertiser='{}' and pattern='{}' and script_name='{}' and start_or_end='{}'"

class BaseDomainHandler(BaseHandler, AnalyticsBase, CassandraRangeQuery, VisitDomainBase):
    
    def initialize(self, db=None, cassandra=None, zookeeper=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.zookeeper = zookeeper
        self.limit = None
        self.DOMAIN_SELECT = "SELECT uid, domain, timestamp FROM rockerbox.visitor_domains_full where uid = ?"
        self.fn = self.get_domains

    def get_details(self, advertiser, pattern, api_type):
        start_data = self.crushercache.select_dataframe(DETAILS_QUERY.format(advertiser, pattern, "udf_{}".format(api_type), 'Start'))
        end_data = self.crushercache.select_dataframe(DETAILS_QUERY.format(advertiser, pattern, "udf_{}".format(api_type), 'End'))
        start_time = start_data['max(ts)'][0]
        end_time = end_data['max(ts)'][0]
        if start_time and end_time:
            date = start_data['max(ts)'][0].date().strftime('%m-%d-%Y')
            time_taken = (end_time- start_time).seconds
        else:
            date = 0
            time_taken=0
        return {"time_to_cache":time_taken,"date_of_cache":date}

    def get_filter(self,filter_id):
        Q = "SELECT * FROM action_filters WHERE action_id = %s and active = 1 and deleted = 0"
        return self.db.select_dataframe(Q % filter_id)

    def run_filter_url(self,aho_filter,urls):
        truth_dict = { i: aho_filter(i) for i in urls }
        logging.info("ran aho filter on %s domains" % len(urls))
        return truth_dict

    def get_udf(self,lock):
        udf_name = lock.get()
        state, udf = udf_name.split("|")
        udf = udf.replace(",",", ")

        logging.info("state: %s, udf: %s" % (state, udf))

        return state, udf

    def build_udf(self,udf_name,pattern):
        INSERT_UDF = "insert into full_replication.function_patterns (function,pattern) VALUES ('%s','%s')"
        SELECT_UDF = "select * from full_replication.function_patterns where function = '%s' "

        self.cassandra.execute(INSERT_UDF % (udf_name,pattern[0]))
        print self.cassandra.select_dataframe(SELECT_UDF % (udf_name))

    def udf_statement(self,udf):
        QUERY  = """SELECT %(what)s FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered %(where)s"""
        WHAT   = """date, %s""" % udf
        WHERE  = """WHERE source = ? and date = ? and u2 = ?"""

        return self.build_statement(QUERY,WHAT,WHERE)

    @property
    def cache_statement(self):
        CACHE_QUERY = """SELECT %(what)s from rockerbox.pattern_occurrence_u2_counter where %(where)s"""
        CACHE_WHAT  = """date, uid, url, occurrence"""
        CACHE_WHERE = """source=? and action=? and date=? and u2=? """

        return self.build_statement(CACHE_QUERY,CACHE_WHAT,CACHE_WHERE)

    def run_cache(self,pattern,advertiser,dates,start=0,end=10,results=[]):
        data = self.data_plus_values([[advertiser,pattern[0]]],dates)
        cb_args = [advertiser,pattern,results]
        cb_kwargs = {"statement":self.cache_statement}

        is_suffice = helpers.sufficient_limit()

        response = self.run_range(data,start,end,helpers.cache_callback,*cb_args,**cb_kwargs)
        self.sample_used = end

        _,_, results = response

        return [r for r in results if len(r['uid']) > 3]

    def run_uncache(self,pattern,advertiser,dates,results=[],limit=1500):
        # run SAMPLE

        zk_lock = ZKPool(zk=self.zookeeper)
        with zk_lock.get_lock() as lock:

            udf_func, udf_selector = self.get_udf(lock)
            self.build_udf(udf_func,pattern)

            data = self.data_plus_values([[advertiser]], dates)
            callback_args = [advertiser,pattern,results]
            is_suffice = helpers.sufficient_limit(limit)

            stmt = self.udf_statement(udf_selector)
            cb = helpers.wrapped_select_callback(udf_selector)

            response, sample = self.run_sample(data,cb,is_suffice,*callback_args,statement=stmt)

            self.sample_used = sample # NOTE: this is a hack used to scale up the data
            _, _, result = response

        return [r for r in results if len(r['uid']) > 3]



    @decorators.deferred
    def defer_execute(self, selects, advertiser, pattern, date_clause, logic,
                      allow_sample=None, should_cache=False, timeout=60, numdays=20, force_cache=True, force_sample=False):

        dates = build_datelist(numdays)
        inserts, results = [], []

        sample = (0,5) if allow_sample else (0,100)
        self.sample_used = sample[1]

        # check if the cache has enough days in it
        # if not, skip the cache and go direct
        from link import lnk
        URL = "select * from pattern_cache where pixel_source_name = '%s' and url_pattern = '%s'"
        df = lnk.dbs.rockerbox.select_dataframe(URL % (advertiser,pattern[0]))
        results = self.run_cache(pattern,advertiser,dates,0,5,results) 
        import ipdb; ipdb.set_trace()
        if len(results)>1000000:
            return pandas.DataFrame(results)
        if allow_sample is None:
            results = self.run_uncache(pattern,advertiser,dates,results)
            force_sample = True if len(results) >4000 else False

            if not force_sample and (force_cache or (len(df[df.num_days > 5]) > 0)):
                results = self.run_cache(pattern,advertiser,dates,sample[0],sample[1],results)
                logging.info("Results in cache: %s" % len(results))
        else:
            if allow_sample:
                #true is we want sample
                results = self.run_uncache(pattern,advertiser,dates,results)
            else:
                results = self.run_cache(pattern,advertiser,dates,sample[0],sample[1],results)

        df = pandas.DataFrame(results)

        return df

    def calc_stats(self,df):

        # THIS DOES THE SAMPLING TRANSFORMATION
        # HACK: see (self.sample_used)
        multiplier = 100/self.sample_used if self.sample_used else 1
        series = df["url"] + df["uid"]

        return pandas.Series({
            "uniques":len(df.uid.unique())*multiplier,
            "visits":len(series.unique())*multiplier,#len(df.groupby(["url","uid"])),
            "views":len(df)*multiplier#.num_views.sum()
        })

    def raw_to_stats(self,df,dates):
        stats_df = df.groupby("date").apply(self.calc_stats)

        if len(stats_df) == 0:
            stats_df = pandas.DataFrame(index=dates,columns=["uniques", "views", "visits"])
            stats_df = stats_df.fillna(0)

        for d in dates:
            if d not in stats_df.index and len(stats_df) > 0:
                stats_df.ix[d] = 0



        url_stats_df = df.groupby("date").apply(base_helpers.calc_transform_urls)
        url_stats_df.name = "urls"

        return (stats_df, pandas.DataFrame(url_stats_df),df)
    
    #@custom_defer.inlineCallbacksErrors
    @defer.inlineCallbacks
    def sample_stats_onsite(self, term, params, advertiser, date_clause, numdays=20,allow_sample=None,force_sample=False):
        
        df = yield self.defer_execute(params, advertiser, [term], date_clause, "must", numdays=numdays,allow_sample=allow_sample,force_sample=force_sample)
        if len(df) > 0:
            stats_df, url_stats_df, full_df = self.raw_to_stats(df,date_clause)


            defer.returnValue([df,stats_df,url_stats_df,full_df])
        else:
            df = pandas.DataFrame(index=[],columns=["uid"])
            sdf = pandas.DataFrame(index=[],columns=["views","visits","uniques"])
            udf = pandas.DataFrame(index=[],columns=["url"])
            fdf = pandas.DataFrame(index=[],columns=['action', 'date', 'occurrence', 'source', 'u1', 'uid', 'url'])


            defer.returnValue([df,sdf,udf,fdf])

    def get_filter_checker(self,filter_id):
        df = self.get_filter(filter_id)
        if len(df) == 0 : return lambda x: True
        checker = AhoCorasick(list(df.filter_pattern)).has_match

        logging.info("constructed aho")
        return checker

    @defer.inlineCallbacks
    def filter_and_build(self,full_df,dates,filter_id):
        aho_filter = yield self.get_filter_checker(filter_id)
        urls = set(full_df.url)
        value = self.run_filter_url(aho_filter,urls)
        df = full_df[full_df.url.map(lambda x: value[x] )]
        to_return = self.raw_to_stats(df,dates)

        defer.returnValue(to_return)

    @defer.inlineCallbacks
    def get_sampled(self,advertiser,term,dates,num_days,allow_sample=None,filter_id=False):
        sample_args = [term,"",advertiser,dates,num_days,allow_sample,bool(filter_id)]

        full_df, stats_df, url_stats_df, _ = yield self.sample_stats_onsite(*sample_args)
        if len(full_df) > 0 and filter_id:
            stats_df, url_stats_df, full_df = yield self.filter_and_build(full_df,dates,filter_id)

        if (len(full_df.uid.unique()) == 1) or (stats_df.sum().sum() == 0) and allow_sample:
            logging.info("Didnt find anything in the sample! query all the data!")
            sample_args = [term,"",advertiser,dates,num_days,False]
            full_df, stats_df, url_stats_df, _ = yield self.sample_stats_onsite(*sample_args)
            if filter_id:
                stats_df, url_stats_df, full_df = yield self.filter_and_build(full_df,dates,filter_id)
        defer.returnValue([full_df, stats_df, url_stats_df, full_df])

    @defer.inlineCallbacks
    def sample_offsite_domains(self, advertiser, term, uids, num_days=2, ds=False):
        if ds:
            self.DOMAIN_SELECT =ds
        deferreds = [self.defer_get_domains_with_cache(advertiser,term,uids,num_days)]
        dl = defer.DeferredList(deferreds)

        dom = yield dl
        
        defer.returnValue(dom)


    @defer.inlineCallbacks
    def sample_stats_offsite(self, advertiser, term, uids, num_days=2):

        finalValue = pandas.DataFrame(index=[],columns=["domains"])
        dom = False

        if len(uids):
            dom = yield self.sample_offsite_domains(advertiser, term, uids, num_days)

        if dom and (len(dom[0][1]) > 0):
            domains = base_helpers.dom_to_domains(dom)
            domain_stats_df = domains.groupby("date").apply(base_helpers.transform_domains)
            domain_stats_df.name = "domains"

            finalValue = pandas.DataFrame(domain_stats_df)

        defer.returnValue(finalValue)

    @defer.inlineCallbacks
    def get_generic_sampled(self,advertiser,term,dates,num_days):
        sample_args = [term,"",advertiser,dates,num_days]

        filter_id = self.get_argument("filter_id",False)
        if filter_id:
            args = [advertiser,term,dates,num_days,True,filter_id]
            df, stats_df, url_stats_df, full_df = yield self.get_sampled(*args)
        else:
            df, stats_df, url_stats_df, full_df = yield self.sample_stats_onsite(*sample_args)
        uids = list(set(df.uid.values))[:1000]
        domain_stats_df = yield self.sample_stats_offsite(advertiser, term, uids, num_days)
        defer.returnValue([stats_df, domain_stats_df, url_stats_df])

    @decorators.deferred
    def domain_stats_to_domains(self,domain_stats_df):
        import time
        start = time.time()
        if len(domain_stats_df):
            df = base_helpers.group_sum_sort_np_array(domain_stats_df['domains'].values,"domain")
            print start - time.time()
            return df
        else:
            return pandas.DataFrame()

    def get_idf(self,domain_set):
        QUERY = """
            SELECT p.domain, max(p.num_users) as num_users, p.idf, p.category_name, c.parent_category_name 
            FROM reporting.pop_domain_with_category p 
            JOIN category c using (category_name) 
            WHERE domain in (%(domains)s)
            group by domain            
        """

        domain_set = [i.encode("utf-8") for i in domain_set]
        domains = "'" + "','".join(domain_set) + "'"

        return self.db.select_dataframe(QUERY % {"domains":domains})

    @defer.inlineCallbacks
    def get_domains(self, advertiser, pattern_terms, num_days, logic="or",timeout=60, prevent_sample=False, timeseries=False):
        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates,num_days]

        stats_df, domain_stats_df, url_stats_df = yield self.get_generic_sampled(*args)
        domains = yield self.domain_stats_to_domains(domain_stats_df)

        if len(domains) > 0:
            idf = yield self.get_idf(list(set(domains.domain)))
            domains = domains.merge(idf,on="domain")

        response = base_helpers.default_response(pattern_terms,logic,no_results=True)
        response = base_helpers.response_domains(response,domains)
        self.version_2_response(response['domains'])

    def version_2_response(self, current_response):
        df = pandas.DataFrame(current_response)
        versioning = self.request.uri
        if versioning.find('v2') >=0:
            summary = self.summarize(df)
            self.get_content_v2(df, summary)
        else:
            self.get_content_v1(df)
