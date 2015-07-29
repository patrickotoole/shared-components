import tornado.web
import ujson
import pandas
import StringIO
import logging

from ..base import BaseHandler
from analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

from cassandra import ReadTimeout
from cassandra import OperationTimedOut

DEFAULT_INTERVAL = "minute"

QUERY = "SELECT {} FROM rockerbox.visit_uids_lucene "
LUCENE = """{ filter: { type: "boolean", %(logic)s: [%(filters)s]}}"""
FILTER = """{ type:"wildcard", field: "url", value: "*%(pattern)s*"}"""

class SearchBaseHelpers(AnalyticsBase):

    def default_response(self,terms,logic):
 
        response = {
            "search": terms, 
            "logic": logic, 
            "results": [],
            "summary": {}
        }

        return response

    def write_json(self, data):
        self.write(ujson.dumps(data))
        self.finish()

    def write_timeout(self, terms, logic, timeout):
        response = [
            {
                "search": terms,
                "logic": logic,
                "timeout": timeout,
                "error":"Timeout. Try making your query more specific"
            }
        ]
        self.write_json(response)

    @decorators.deferred
    def defer_execute(self, selects, advertiser, pattern, date_clause, logic, 
                      timeout=60):
        if not pattern:
            raise Exception("Must specify search term using search=")

        filters = ','.join([FILTER % {"pattern": p} for p in pattern])
        lucene = LUCENE % {"filters": filters, "logic": logic}
        where = "WHERE source='{}' and lucene='{}'".format(advertiser, lucene)

        q = QUERY.format(selects) + where
        print q
        
        try:
            data = self.cassandra.execute(q,None,timeout=timeout)
        except OperationTimedOut:
            return False

        df = pandas.DataFrame(data)
        return df

    def group_and_count(self, df, groups, value, colname):
        cols = groups + [value]

        d = df[cols].groupby(groups)
        
        # Note: this lambda may look hacky, but it is MUCH faster than nunique
        d = d.agg({value: lambda x: len(set(x))})
        d = d.reset_index()
        d = d.sort(value, ascending=False)
        
        if value != colname:
            d[colname] = d[value]
            del d[value]
        return d

class SearchBase(SearchBaseHelpers):

    @defer.inlineCallbacks
    def get_count(self, advertiser, terms, date_clause, logic="should",timeout=60):
        PARAMS = "uid"

        response = self.default_response(terms,logic)
        response['summary']['num_users'] = 0

        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, logic)

        if len(df) > 0:
            uids = df.uid.value_counts()
            response['summary']['num_users'] = len(uids)

        del response['results'] # there are no results for this API
        self.write_json(response)

    @defer.inlineCallbacks
    def get_timeseries(self, advertiser, terms, date_clause, logic="should",timeout=60):
        PARAMS = "timestamp, url, uid"

        response = self.default_response(terms,logic)
        
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, logic)
        
        if len(df) > 0:
            # Get the user counts for each timestamp, timestamp/url
            users = self.group_and_count(df, ["timestamp"], "uid", "num_users")
            visits = self.group_and_count(df, ["timestamp","url"], "uid", "num_visits")

            # Get the total number of visits, users
            response['summary']['num_visits'] = visits.num_visits.sum()
            response['summary']['num_users'] = len(df.uid.value_counts())
            
            # Make a timeseries for each unique url visits
            del visits["url"] # get rid of string since we dont need the name
            visits_ts = visits.groupby("timestamp").sum().sort().reset_index()
            
            # Combine the users/visits counts for each timestamp
            results = visits_ts.set_index("timestamp")
            results = results.join(users.set_index("timestamp")).reset_index()
            results = Convert.df_to_values(results)

            response['results'] = results
        
        self.write_json(response)

    @defer.inlineCallbacks
    def get_urls(self, advertiser, terms, date_clause, logic="should", timeout=60):
        PARAMS = "url, uid"
        response = self.default_response(terms,logic)

        df = yield self.defer_execute(PARAMS, advertiser, terms, 
                                       date_clause, logic, timeout=timeout)

        if df is False:
            self.write_timeout(terms, logic, timeout)
        elif len(df) == 0:
            self.write_json([])
        else:
            counts = self.group_and_count(df, ["url"], "uid", "count")
            
            response = {
                "search": terms, 
                "logic": logic, 
                "timeout": timeout,
                "results": Convert.df_to_values(counts)
                }
            
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
    


class VisitUidsV2Handler(BaseHandler, SearchBase):

    LOGIC = {
        "or":"should",
        "and":"must"
    }

    

    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None
        self.query = QUERY
        self.TYPE = {
            "uids": self.get_uids,
            "count": self.get_count,
            "timeseries": self.get_timeseries,
            "urls": self.get_urls
        }

    @decorators.formattable
    def get_content(self, data, advertiser):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.render("analysis/bloodhound_test.html", data=df, 
                        advertiser=advertiser)
        yield default, (data,)

    
    def invalid(self,*args,**kwargs):
        raise Exception("Invalid api call")

    @tornado.web.asynchronous
    def get(self, api_type):
        _logic = self.get_argument("logic", "or")
        terms = self.get_argument("search", False)
        formatted = self.get_argument("format", False)
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        advertiser = self.get_argument("advertiser", "")
        timeout = self.get_argument("timeout", 60)

        date_clause = self.make_date_clause("timestamp", date, start_date, end_date)

        logic = self.LOGIC.get(_logic,"should")
        
        if not formatted:
            # short circuit for now... should just remove in the future
            self.get_content(pandas.DataFrame(), advertiser)
            return         

        if terms:
            terms = terms.split(',')

        fn = self.TYPE.get(api_type,self.invalid)

        fn(advertiser, terms, date_clause, logic=logic, timeout=int(timeout))
