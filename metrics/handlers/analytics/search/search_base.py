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

class SearchBase(SearchHelpers,AnalyticsBase,BaseHandler):

    # TODO: add in the page_view counts

    @decorators.deferred
    def defer_execute(self, selects, advertiser, pattern, date_clause, logic, 
                      timeout=60, numdays=9):
        if not pattern:
            raise Exception("Must specify search term using search=")

        filter_list = [FILTER % {"pattern": p.lower()} for p in pattern]
        filters = ','.join(filter_list) 
        
        import datetime, time
        
        base = datetime.datetime.today()
        date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
        dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

        l = []
        errs = []
        total = []
           
        start = time.time()
        try:

            # build a list of futures
            futures = []
            queries = []
            self.logging.info(filters)
            prefixes = range(0,100)
            for i in prefixes:
                f = filters
                lucene = LUCENE % {"filters": f, "logic": logic}
                where = WHERE % {"advertiser":advertiser, "lucene":lucene}
                query = QUERY % {"what":selects, "where": where}

                for date in dates:
                    date_str = " and date='%s'" % date 
                    date_str += " and u2 = %s" % i
                    queries.append(query + date_str )

            from itertools import count
            from threading import Event
            print queries[0]
            
            sentinel = object()
            num_queries = len(queries)
            num_started = count()
            num_finished = count()
            finished_event = Event()
            hosts = {}
            error_hosts = {}
            
            def insert_next(previous_result=sentinel,host="",l=l):
                f = 0
                if type(previous_result) is list or isinstance(previous_result, BaseException):
                    if isinstance(previous_result, BaseException):
                        self.logging.error("Error on : %r %r", previous_result, host)
                        error_hosts[host] = error_hosts.get(host,0) + 1
                    else:
                        l += previous_result
                    f = num_finished.next()
                    if f >= num_queries:
                        finished_event.set()
            
                c = num_started.next()

                # pulls another entry off the queue to runs it
                if c <= num_queries:
                    future = self.cassandra.execute_async(queries[c-1])
                    hosts[future._current_host.address] = hosts.get(future._current_host.address,0) + 1
                    future.add_callbacks(lambda x: insert_next(x,queries[c-1],l), lambda x: insert_next(x,queries[c-1] + " : " + future._current_host.address))

            # creates a batch of 80 request workers
            for i in range(min(80, num_queries)):
                insert_next()
            
            finished_event.wait()
            print "finished"
            
            self.logging.info(start - time.time()) 
            self.logging.info(len(l))

            df = pandas.DataFrame(l)
            
            # If the query contains a capital letter, filter out any results 
            # that don't exactly match the query (case sensitive)
            if [c for c in pattern[0] if c.isupper()]:
                df = df[df.url.str.contains(pattern[0])]

            print errs
            
            
            return df
        except OperationTimedOut as exp:
            return False

        

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
