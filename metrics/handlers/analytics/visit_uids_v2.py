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

class VisitUidsV2Handler(BaseHandler, AnalyticsBase):
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None
        self.query = QUERY

    @decorators.formattable
    def get_content(self, data, advertiser):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.render("analysis/bloodhound_test.html", data=df, 
                        advertiser=advertiser)
        yield default, (data,)

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

    @defer.inlineCallbacks
    def get_count(self, advertiser, terms, date_clause, logic="should"):
        df = yield self.defer_execute("uid", advertiser, terms, date_clause, logic)

        if len(df) == 0:
            count = 0
        else:
            uids = df.uid.value_counts()
            count = len(uids)

        response = {"search": terms, "logic": logic, "num_users": count}
        self.write_json(response)

    @defer.inlineCallbacks
    def get_timeseries(self, advertiser, terms, date_clause, logic="should"):
        df = yield self.defer_execute(
            "timestamp, url, uid", 
            advertiser, 
            terms, 
            date_clause, 
            logic
        )

        if len(df) == 0:
            counts = []
            num_visits = 0
            num_users = 0
        else:
            # Get the total number of users
            num_users = len(df.uid.value_counts())

            # Get the user counts for each timestamp
            users = self.group_and_count(df, ["timestamp"], "uid", "num_users")
            
            # Get the visit counts for each timestamp/url combination
            visits = self.group_and_count(df, ["timestamp","url"], "uid", "uid")

            # Get the total number of visits
            num_visits = visits.uid.sum()

            del visits["url"]
            
            # Now get the sum of visits for each url
            visits = visits.groupby("timestamp").sum().sort().reset_index()

            visits["num_visits"] = visits.uid
            del visits["uid"]
            
            # Combine the users/visits counts for each timestamp
            counts = visits.set_index("timestamp")
            counts = counts.join(users.set_index("timestamp")).reset_index()
            counts = Convert.df_to_values(counts)
            
        response = {
            "search": terms, 
            "logic": logic, 
            "results": counts,
            "num_visits": num_visits,
            "num_users": num_users
        }
        self.write_json(response)

    @defer.inlineCallbacks
    def get_urls(self, advertiser, terms, date_clause, logic="should", 
                 timeout=60):

        df = yield self.defer_execute( "url, uid", advertiser, terms, 
                                       date_clause, logic, timeout=timeout)

        if not isinstance(df, pandas.DataFrame) and not df:
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
    def get_uids(self, advertiser, terms, date_clause, logic="should"):
        df = yield self.defer_execute("uid", advertiser, terms, date_clause, logic)

        if len(df) == 0:
            uids = []
        else:
            uids = df.drop_duplicates().uid.tolist()

        count = len(uids)
        response = {
            "search": terms, 
            "logic": logic, 
            "num_users": count, 
            "results": uids
        }
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

    @tornado.web.asynchronous
    def get(self, api_type):
        logic = self.get_argument("logic", "or")
        terms = self.get_argument("search", False)
        formatted = self.get_argument("format", False)
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        advertiser = self.get_argument("advertiser", "")
        timeout = self.get_argument("timeout", 60)

        date_clause = self.make_date_clause("timestamp", date, start_date, end_date)

        if logic == "or":
            logic = "should"
        elif logic == "and":
            logic = "must"

        if terms:
            terms = terms.split(',')
            
        if formatted:
            if api_type=="uids":
                self.get_uids(advertiser, terms, date_clause, logic=logic)
            elif api_type=="count":
                self.get_count(advertiser, terms, date_clause, logic=logic)
            elif api_type=="timeseries":
                self.get_timeseries(advertiser, terms, date_clause, logic=logic)
            elif api_type == "urls":
                self.get_urls(advertiser, terms, date_clause, logic=logic, 
                              timeout=int(timeout))
            else:
                raise Exception("Invalid api call")
        else:
            self.get_content(pandas.DataFrame(), advertiser)
