import tornado.web
import tornado.ioloop
import logging

from search_helpers import SearchHelpers, SearchCassandraHelpers

helpers = SearchCassandraHelpers

from ..analytics_base import AnalyticsBase
from ...base import BaseHandler

from twisted.internet import defer
from lib.helpers import *
from cassandra import OperationTimedOut
from lib.cassandra_helpers.range_query import CassandraRangeQuery
from lib.zookeeper.zk_pool import ZKPool



def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates



class SearchCassandra(SearchHelpers,AnalyticsBase,BaseHandler,CassandraRangeQuery):

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
        self.cassandra.select_dataframe(SELECT_UDF % (udf_name))

    def udf_statement(self,udf):
        QUERY  = """SELECT %(what)s FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered %(where)s"""
        WHAT   = """date, %s""" % udf
        WHERE  = """WHERE source = ? and date = ? and u2 = ?"""

        return self.build_statement(QUERY,WHAT,WHERE)

    @property
    def raw_statement(self):
        QUERY  = """SELECT %(what)s FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered %(where)s"""
        WHAT   = """date, group_and_count(url,uid)"""
        WHERE  = """WHERE source = ? and date = ? and u2 = ?"""

        return self.build_statement(QUERY,WHAT,WHERE)

    @property
    def cache_statement(self):
        CACHE_QUERY = """SELECT %(what)s from rockerbox.pattern_occurrence_u2_counter where %(where)s"""
        CACHE_WHAT  = """date, uid, url, occurrence"""
        CACHE_WHERE = """source=? and action=? and date=? and u2=? """

        return self.build_statement(CACHE_QUERY,CACHE_WHAT,CACHE_WHERE)
    
    def run(self,pattern,advertiser,dates,results=[]):
        # run SAMPLE

        zk_lock = ZKPool(zk=self.zookeeper)
        with zk_lock.get_lock() as lock:

            udf_func, udf_selector = self.get_udf(lock)
            self.build_udf(udf_func,pattern)
        
            data = self.data_plus_values([[advertiser]], dates)
            callback_args = [advertiser,pattern,results]
            is_suffice = helpers.sufficient_limit()

            stmt = self.udf_statement(udf_selector)
            cb = helpers.wrapped_select_callback(udf_selector)

            response, sample = self.run_sample(data,cb,is_suffice,*callback_args,statement=stmt)

            self.sample_used = sample # NOTE: this is a hack used to scale up the data
            _, _, result = response

        return results


    def run_cache(self,pattern,advertiser,dates,start=0,end=10,results=[]):

        data = self.data_plus_values([[advertiser,pattern[0]]],dates)
        cb_args = [advertiser,pattern,results]
        cb_kwargs = {"statement":self.cache_statement}
        
        is_suffice = helpers.sufficient_limit()

        response = self.run_range(data,start,end,helpers.cache_callback,*cb_args,**cb_kwargs)
        self.sample_used = end

        _,_, results = response
        
        return results

        
    def run_uniques(self, advertiser, pattern, dates):
        import datetime
        import pickle
        import work_queue

        import lib.cassandra_cache.run_uniques as unique_cache

        for cache_date in dates:
            delta = datetime.datetime.now() - cache_date
            _cache_date = datetime.datetime.strftime(cache_date,"%Y-%m-%d")

            work = pickle.dumps((
                unique_cache.run_uniques,
                [advertiser,pattern,1,delta.days -1,True,_cache_date + " unique_cache"]
            ))

            work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,0)
    

class SearchBase(SearchCassandra):

    def build_deferred_list(self, terms_list, params, advertiser, date_clause, logic="must", numdays=20):
        dl = []
        for terms in terms_list:
            dl += [self.defer_execute(params, advertiser, terms, date_clause, logic, numdays=numdays)]
        
        return defer.DeferredList(dl)

    @decorators.deferred
    def defer_execute(self, selects, advertiser, pattern, date_clause, logic, 
                      allow_sample=True, timeout=60, numdays=20, should_cache=True):


        dates = build_datelist(numdays)
        inserts, results = [], []

        sample = (0,5) if allow_sample else (0,100)
        self.sample_used = sample[1]

        # check if the cache has enough days in it
        # if not, skip the cache and go direct
        from link import lnk
        URL = "select * from pattern_cache where pixel_source_name = '%s' and url_pattern = '%s'"
        df = lnk.dbs.rockerbox.select_dataframe(URL % (advertiser,pattern[0]))

        if len(df[df.num_days > 5]) > 0:
            results = self.run_cache(pattern,advertiser,dates,sample[0],sample[1],results)
            logging.info("Results in cache: %s" % len(results))
        
        if len(results) == 0:
            results = self.run(pattern,advertiser,dates,results)

            if should_cache:
                import work_queue
                import lib.cassandra_cache.pattern as cache
                import pickle
                import datetime

                today = datetime.datetime.now()
                children = self.zookeeper.get_children("/active_pattern_cache")
                child = advertiser + "=" + pattern[0].replace("/","|")

                if child in children:
                    pass
                else:
                    self.zookeeper.ensure_path("/active_pattern_cache/" + child)

                    for i in range(0,21):
                        delta = datetime.timedelta(days=i)
                        _cache_date = datetime.datetime.strftime(today - delta,"%Y-%m-%d")

                        work = pickle.dumps((
                            cache.run_one,
                            [advertiser,pattern[0],1,i,True,_cache_date]
                        ))

                        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,i)

                
        df = pandas.DataFrame(results)

        return df

        

    @defer.inlineCallbacks
    def get_count(self, advertiser, terms, date_clause, logic="should",timeout=60):
        PARAMS = "uid"

        response = self.default_response(terms,logic)
        del response['results'] # there are no results, only summary 
        response['summary']['num_users'] = 0

        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, logic)

        if len(df) > 0:
            uids = df.uid.value_counts()
            response['summary']['num_users'] = len(uids)

        self.write_json(response)

    @defer.inlineCallbacks
    def get_timeseries(self, advertiser, terms, date_clause, logic="should",timeout=60):
        PARAMS = "date, url, uid"

        response = self.default_response(terms,logic)
        
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, logic)
        
        if len(df) > 0:
            # Get the user counts for each date, date/url
            users = self.group_and_count(df, ["date"], "uid", "num_users")
            visits = self.group_and_count(df, ["date","url"], "uid", "num_visits")

            # Get the total number of visits, users
            response['summary']['num_visits'] = visits.num_visits.sum()
            response['summary']['num_users'] = len(df.uid.value_counts())
            
            # Make a timeseries for each unique url visits
            del visits["url"] # get rid of string since we dont need the name
            visits_ts = visits.groupby("date").sum().sort().reset_index()
            
            # Combine the users/visits counts for each date
            results = visits_ts.set_index("date")
            results = results.join(users.set_index("date")).reset_index()
            results = Convert.df_to_values(results)

            response['results'] = results
        
        self.write_json(response)

    @defer.inlineCallbacks
    def get_urls(self, advertiser, terms, date_clause, logic="should", timeout=60):
        PARAMS = "url, uid"
        response = self.default_response(terms,logic)
        response["timeout"] = timeout

        df = yield self.defer_execute(PARAMS, advertiser, terms, 
                       date_clause, logic, timeout=timeout, should_cache=False, numdays=7)

        if df is False:
            self.write_timeout(terms, logic, timeout)
            return
        
        counts = pandas.DataFrame([])
        uid_counts = 0

        if len(df) > 0:
            counts = self.group_and_count(df, ["url"], "uid", "count")
            uid_counts = df.uid.value_counts()

        response["results"] = Convert.df_to_values(counts)
        response["summary"]["num_urls"] = len(counts)
        response["summary"]["num_users"] = len(set(df.uid.values))
       
            
        self.write_json(response)

    @defer.inlineCallbacks
    def get_uids(self, advertiser, terms, date_clause, logic="should", timeout=60):
        PARAMS = "uid"
        response = self.default_response(terms,logic)

        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, logic, false)

        if len(df) > 0:
            response['results'] = df.drop_duplicates().uid.tolist()
            response['summary']['num_users'] = len(response['results'])

        self.write_json(response)
