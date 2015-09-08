import tornado.web
import logging

from search_helpers import SearchHelpers
from ..analytics_base import AnalyticsBase
from ...base import BaseHandler

from twisted.internet import defer
from lib.helpers import *
from cassandra import OperationTimedOut

QUERY  = """SELECT %(what)s FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered %(where)s"""
WHERE  = """WHERE source='%(advertiser)s' and lucene='%(lucene)s'"""
LUCENE = """{ filter: { type: "boolean", %(logic)s: [%(filters)s]}}"""
FILTER = """{ type:"wildcard", field: "url", value: "*%(pattern)s*"}"""

INSERT_STATEMENT = "INSERT INTO rockerbox.action_occurrence_u1 (source,date,action,uid,u1,url,occurrence) VALUES ('%(source)s','%(date)s','%(action)s','%(uid)s', %(u1)s,'%(url)s',%(occurrence)s)"

def max_steps_event(max_steps):
    # make an event that allows its callback to be called exactly X times before 
    # notifying that it is complete
    from itertools import count
    from threading import Event

    finished_event = Event()
    num_finished = count()

    def step():
        finished = num_finished.next()
        #print finished, max_steps
        if finished == (max_steps-1):
            finished_event.set()

    return (finished_event,step)


#def run_next(result,iterable,always,success,failure,*args):
def run_next(result,iterable,run_future,always,success,*args):
    """ 
    """
    def cb_with_result(result):
        run_next(result,iterable,run_future,always,success,*args)
        always()
        return 

    if type(result) is list:
        success(result[0],*args)
    else:
        pass

    try:
        query = iterable.next()
        future = run_future(query)
        print future._current_host.address
        future.add_callbacks(cb_with_result,cb_with_result)
    except Exception as e:
        #print e

        pass
            
def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates


class CassandraBoundStatement(object):

    def __init__(self,session=None):
        self.cassandra = session

    def build_bound_statement(self):
        what = "date, group_and_count(url,uid)"
        where = "WHERE source = ? and date = ? and u2 = ?"
        params = { "what": what, "where": where }
        statement = self.cassandra.prepare(QUERY % params)
        return statement

    def build_bound_data(self,advertiser,dates,start,end):
        prefixes = range(start,end)

        return [[advertiser,date,i] for i in prefixes for date in dates]

    def bind_and_execute(self,statement):

        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)

        return execute


class SearchBase(SearchHelpers,AnalyticsBase,BaseHandler,CassandraBoundStatement):



    def build_queries(self,dates,advertiser,start=0,end=100): 
        prefixes = range(start,end)
        queries = []
        where = "WHERE source='%(advertiser)s'" % {"advertiser":advertiser}
        query = QUERY % {"what":"date,group_and_count(url,uid)", "where": where}

        for i in prefixes:
            for date in dates:
                date_str = " and date='%s' and u2 = %s" % (date,i)
                queries.append(query + date_str)

        return queries

    def run_range(self,pattern,statement,advertiser,dates,start=0,end=100,results=[]):

        def select_callback(result,results,inserts,*args):
            res = result['rockerbox.group_and_count(url, uid)']
            date = result["date"]
            for url_uid in res:
                if url_uid == "__pattern__": 
                    continue
                else:
                    url, uid = url_uid.split("[:]")
                    reconstructed = []
                    
                    for i in range(0,int(res[url_uid])):
                        h = { "uid":uid, "date":date, "url":url, "occurrence":i, "source":advertiser, "action":",".join(pattern), "u1":uid[-2:] }
                        reconstructed += [h]
                        inserts += [INSERT_STATEMENT % h]
        
                    if len(reconstructed) > 0: results += reconstructed


        function_to_bind = self.bind_and_execute(statement)
        data_to_bind = self.build_bound_data(advertiser,dates,start,end)
        
        data_len = len(data_to_bind)
        iterable = iter(data_to_bind)
        event, step = max_steps_event(data_len)
        for i in range(min(300, data_len)):
            run_next(False,iterable,function_to_bind,step,select_callback,results,[])
        event.wait()
        
        return results
 
        

    def run_sample(self,pattern,statement,advertiser,dates,results):
        
        logging.info("starting sample")
        results = self.run_range(pattern,statement,advertiser,dates,0,1,results)
        logging.info("finished sample") 
        
        return results

    def build_udf(self,pattern):
        self.cassandra.execute("insert into full_replication.function_patterns (function,pattern) VALUES ('state_group_and_count','%s')" % pattern[0])
        
    
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
