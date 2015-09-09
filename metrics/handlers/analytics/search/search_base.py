import tornado.web
import logging

from search_helpers import SearchHelpers
from ..analytics_base import AnalyticsBase
from ...base import BaseHandler

from twisted.internet import defer
from lib.helpers import *
from cassandra import OperationTimedOut
from cassandra_helpers import *

QUERY  = """SELECT %(what)s FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered %(where)s"""
WHAT   = "date, group_and_count(url,uid)"
WHERE  = "WHERE source = ? and date = ? and u2 = ?"
INSERT = """INSERT INTO rockerbox.action_occurrence_u1 (source,date,action,uid,u1,url,occurrence) VALUES (?,?,?,?,?,?,?) """
INSERT_NO_DIST = """INSERT INTO rockerbox.action_occurrence (source,date,action,uid,url,occurrence) VALUES (?,?,?,?,?,?) """

INSERT_CACHE = "INSERT INTO rockerbox.action_occurrence_u1 (source,date,action,uid,u1,url,occurrence) VALUES ('%(source)s','%(date)s','%(action)s','%(uid)s', %(u1)s,'%(url)s',%(occurrence)s)"

INSERT_UDF = "insert into full_replication.function_patterns (function,pattern) VALUES ('state_group_and_count','%s')"

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

def select_callback(result,advertiser,pattern,results,*args):
    result = result[0]
    res = result['rockerbox.group_and_count(url, uid)']
    date = result["date"]
    for url_uid in res:
        if "[:]" in url_uid:
            url, uid = url_uid.split("[:]")
            reconstructed = []
            
            for i in range(0,int(res[url_uid])):
                h = format(uid,date,url,i,advertiser,pattern)
                reconstructed += [h]

            results += reconstructed



class SearchBase(SearchHelpers,AnalyticsBase,BaseHandler,CassandraStatement):

    
    def run(self,pattern,advertiser,dates,start=0,end=100,results=[]):

        self.build_udf(pattern)

        statement = self.build_statement(QUERY,WHAT,WHERE)
        bound_statement = self.bind_and_execute(statement)
        data = self.build_bound_data([advertiser],dates,start,end)

        callback = select_callback
        callback_args = [advertiser,pattern,results]

        _, _, result = FutureHelpers.future_queue(data,bound_statement,callback,300,*callback_args)
                
        return results


    def run_cache(self,pattern,advertiser,dates,start=0,end=10,results=[]):

        def callback_simple(result,advertiser,pattern,results,*args):
            extra = []
            for res in result:
                extra += [res]*res['occurrence']

            results += result
            results += extra

        
        query = "SELECT %(what)s from rockerbox.action_occurrence_u1 where %(where)s"
        what = "date, uid, url, occurrence"
        where = "source=? and action=? and date=? and u1=?"

        statement = self.build_statement(query,what,where)
        bound = self.bind_and_execute(statement)
        data = self.build_bound_data([advertiser,pattern[0]],dates,start,end)
        callback_args = [advertiser,pattern,results]

        _,_, results = FutureHelpers.future_queue(data,bound,callback_simple,300,*callback_args)
        
        return results
 
    def build_udf(self,pattern):
        self.cassandra.execute(INSERT_UDF % pattern[0])
        
    
    @decorators.deferred
    def defer_execute(self, selects, advertiser, pattern, date_clause, logic, 
                      allow_sample=True, timeout=60, numdays=20):

        dates = build_datelist(numdays)
        inserts, results = [], []

        # first check the cache
        sample = (0,5) if allow_sample else (0,100)
        results = self.run_cache(pattern,advertiser,dates,sample[0],sample[1],results)

        # if not in the cache, run a sampled query
        if len(results) == 0:
            logging.info("not cached")
            too_small = 300
            sample_sizes = [(0,1),(1,2),(2,5),(5,50),(50,100)]
            for sample in sample_sizes:
                logging.info("Grabbing sample %s, %s" % sample) 
                results = self.run(pattern,advertiser,dates,sample[0],sample[1],results)
                if len(results) > too_small: break

            # trigger cache job
            # TODO: make this function
                
        df = pandas.DataFrame(results)
        self.sample_used = sample[1]
        
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

        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, logic, false)

        if len(df) > 0:
            response['results'] = df.drop_duplicates().uid.tolist()
            response['summary']['num_users'] = len(response['results'])

        self.write_json(response)
