import tornado.web
import logging

from search_helpers import SearchHelpers
from ..analytics_base import AnalyticsBase
from ...base import BaseHandler

from twisted.internet import defer
from lib.helpers import *
from cassandra import OperationTimedOut
from cassandra_helpers import *


INSERT_CACHE = "INSERT INTO rockerbox.action_occurrence_u1 (source,date,action,uid,u1,url,occurrence) VALUES ('%(source)s','%(date)s','%(action)s','%(uid)s', %(u1)s,'%(url)s',%(occurrence)s)"

INSERT_UDF = "insert into full_replication.function_patterns (function,pattern) VALUES ('state_group_and_count','%s')"

def format(uid,date,url,occurrence,advertiser,pattern):
    return { 
        "uid":uid, 
        "date":date, 
        "url":url, 
        "occurrence":i, 
        "source":advertiser, 
        "action":",".join(pattern), 
        "u1":uid[-2:] 
    }

class SearchBase(SearchHelpers,AnalyticsBase,BaseHandler,CassandraBoundStatement):

    def select_callback(self,result,results,inserts,*args):
        res = result['rockerbox.group_and_count(url, uid)']
        date = result["date"]
        for url_uid in res:
            if "[:]" in url_uid:
                url, uid = url_uid.split("[:]")
                reconstructed = []
                
                for i in range(0,int(res[url_uid])):
                    h = format(uid,date,url,occurrence,advertiser,pattern)
                    reconstructed += [h]
                    #inserts += [INSERT_STATEMENT % h]
    
                if len(reconstructed) > 0: results += reconstructed



    def run_range(self,pattern,statement,advertiser,dates,start=0,end=100,results=[]):

        
        bound_statement = self.bind_and_execute(statement)
        data = self.build_bound_data(advertiser,dates,start,end)

        callback = self.select_callback
        callback_args = [results,[]]

        results, inserts = FutureHelpers.future_queue(data,bound_statement,callback,300,*callback_args)
                
        return results
 
        

    def run_sample(self,pattern,statement,advertiser,dates,results):
        
        results = self.run_range(pattern,statement,advertiser,dates,0,1,results)
        return results

    def build_udf(self,pattern):
        self.cassandra.execute(INSERT_UDF % pattern[0])
        
    
    @decorators.deferred
    def defer_execute(self, selects, advertiser, pattern, date_clause, logic, 
                      timeout=60, numdays=20):

        assert(pattern, "Must specify search term using search=")

        self.build_udf(pattern)
        dates = build_datelist(numdays)
        statement = self.build_bound_statement()

        # if cache has pattern
        # then pull the data from the cache
        
       
        # else run a sample
        results = []
        results = self.run_sample(pattern,statement,advertiser,dates,results)

        # determine if we have enough information for a good sample
        # if not grab more info...
        # check if the size was too small and increase the sample size
        size, too_small = len(results), 300
        if size < too_small:
            logging.info("more results")
            results = self.run_range(pattern,statement,advertiser,dates,1,5,results)

        size, too_small = len(results), 300
        if size < too_small:
            logging.info("more results")
            results = self.run_range(pattern,statement,advertiser,dates,5,100,results)



        print "starting insert"
        #insert_queries = insert_queries[:10]
        if False and len(insert_queries) > 0 and False:
            iterable = iter(insert_queries)
            event, step = max_steps_event(len(insert_queries))
            run_future = self.cassandra.execute_async
            for i in range(min(300, len(insert_queries))):
                run_next(False,iterable,run_future,step,lambda x: x)
            
            event.wait()
        print "finishing insert"

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
                                       date_clause, logic, timeout=timeout)

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

        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, logic)

        if len(df) > 0:
            response['results'] = df.drop_duplicates().uid.tolist()
            response['summary']['num_users'] = len(response['results'])

        self.write_json(response)
