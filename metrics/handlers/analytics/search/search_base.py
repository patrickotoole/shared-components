import tornado.web
import tornado.ioloop
import logging

from search_helpers import SearchHelpers
from ..analytics_base import AnalyticsBase
from ...base import BaseHandler

from twisted.internet import defer
from lib.helpers import *
from cassandra import OperationTimedOut
from lib.cassandra_helpers.range_query import CassandraRangeQuery
from lib.zookeeper.zk_pool import ZKPool

QUERY  = """SELECT %(what)s FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered %(where)s"""
WHAT   = "date, group_and_count(url,uid)"
WHERE  = "WHERE source = ? and date = ? and u2 = ?"

CACHE_QUERY = """SELECT %(what)s from rockerbox.pattern_occurrence_u2_counter where %(where)s"""
CACHE_WHAT  = """date, uid, url, occurrence"""
CACHE_WHERE = """source=? and action=? and date=? and u2=? """



INSERT_UDF = "insert into full_replication.function_patterns (function,pattern) VALUES ('%s','%s')"

def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates

def format(uid,date,url,occurrence,advertiser,pattern):
    return { 
        "uid":uid, 
        "date":date, 
        "url":url, 
        "occurrence":occurrence, 
        "source":advertiser, 
        "action":",".join(pattern), 
        "u1":uid[-2:] 
    }

def wrapped_select_callback(field):

    def select_callback(result,advertiser,pattern,results,*args):
        result = result[0]
        res = result["rockerbox." +field]
        date = result["date"]
        for url_uid in res:
            if "[:]" in url_uid:
                url, uid = url_uid.split("[:]")
                reconstructed = []
                
                for i in range(0,int(res[url_uid])):
                    h = format(uid,date,url,i,advertiser,pattern)
                    reconstructed += [h]
    
                results += reconstructed

    return select_callback

def cache_callback(result,advertiser,pattern,results,*args):
    extra = []
    for res in result:
        extra += [res]*res['occurrence']

    results += result
    results += extra

def sufficient_limit(size=300):

    def suffices(x):
        _, _, result = x
        print len(result)
        return len(result) > size

    return suffices

class SearchBase(SearchHelpers,AnalyticsBase,BaseHandler,CassandraRangeQuery):


    @property
    def raw_statement(self):
        return self.build_statement(QUERY,WHAT,WHERE)

    @property
    def cache_statement(self):
        return self.build_statement(CACHE_QUERY,CACHE_WHAT,CACHE_WHERE)
    
    def run(self,pattern,advertiser,dates,results=[]):

        zk_lock = ZKPool(zk=self.zookeeper)
        with zk_lock.get_lock() as lock:

            udf_name = lock.get()
            state, udf = udf_name.split("|")
            udf = udf.replace(",",", ")

            logging.info("state: %s, udf: %s" % (state, udf))

            self.build_udf(state,pattern)
        
            data = self.data_plus_values([[advertiser]], dates)
            callback_args = [advertiser,pattern,results]
            is_suffice = sufficient_limit()

            stmt = self.build_statement(QUERY,"date, %s" % udf,WHERE)

            response, sample = self.run_sample(data,wrapped_select_callback(udf),is_suffice,*callback_args,statement=stmt)

            self.sample_used = sample
            _, _, result = response

        #zk_lock.stop()
                
        return results


    def run_cache(self,pattern,advertiser,dates,start=0,end=10,results=[]):

        data = self.data_plus_values([[advertiser,pattern[0]]],dates)
        cb_args = [advertiser,pattern,results]
        cb_kwargs = {"statement":self.cache_statement}
        
        is_suffice = sufficient_limit(300)


        response = self.run_range(data,start,end,cache_callback,*cb_args,**cb_kwargs)
        self.sample_used = end

        _,_, results = response
        
        return results
 
    def build_udf(self,udf_name,pattern):
        self.cassandra.execute(INSERT_UDF % (udf_name,pattern[0]))
        
    
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

        if len(df[df.num_days > 7]) > 0:
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
