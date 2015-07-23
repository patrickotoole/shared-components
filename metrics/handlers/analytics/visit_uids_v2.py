import tornado.web
import ujson
import pandas
import StringIO
import logging
import signal

from ..base import BaseHandler
from analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

from cassandra import ReadTimeout

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
        signal.signal(signal.SIGALRM, self.timeout_handler)
        signal.alarm(2)

    def timeout_handler(self, signum, frame):
        print "We're done here.."
        raise Exception("Timeout")

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.render("analysis/bloodhound_test.html", data=df)
        yield default, (data,)

    def write_json(self, data):
        self.write(ujson.dumps(data))
        self.finish()

    @defer.inlineCallbacks
    def get_count(self, advertiser, terms, date_clause, logic="should"):
        df = yield self.defer_execute("uid", advertiser, terms, date_clause, logic)
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

        users = df[["timestamp","uid"]].groupby(["timestamp"]).agg({"uid": lambda x: len(set(x))})
        users = users.reset_index()
        users["num_users"] = users.uid
        del users["uid"]
        print users

        visits = df.groupby(["timestamp", "url"]).agg({"uid": lambda x: len(set(x))})
        visits = pandas.DataFrame(visits).reset_index()
        del visits["url"]

        visits = visits.groupby("timestamp").sum().sort().reset_index()
        visits["num_visits"] = visits.uid
        del visits["uid"]

        counts = visits.set_index("timestamp").join(users.set_index("timestamp")).reset_index()

        response = {
            "search": terms, 
            "logic": logic, 
            "counts": Convert.df_to_values(counts)
        }
        self.write_json(response)

    @defer.inlineCallbacks
    def get_urls(self, advertiser, terms, date_clause, logic="should"):
        df = yield self.defer_execute("url, uid", advertiser, terms, date_clause, logic)

        if len(df) == 0:
            self.write_json([])
        else:

            print "Grouping..."
            counts = df.groupby("url").agg({"uid": lambda x: len(set(x))})
            counts = pandas.DataFrame(counts).reset_index()
            counts = counts.sort("uid", ascending=False)
            
            counts["count"] = counts.uid
            del counts["uid"]
            
            tmp = counts.url.value_counts().index.tolist()
            
            response = {
                "search": terms, 
                "logic": logic, 
                "urls": Convert.df_to_values(counts)
                }
            response = tmp
            response = Convert.df_to_values(counts)
            
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
            "uids": uids
        }
        self.write_json(response)

    @decorators.deferred
    def defer_execute(self, selects, advertiser, pattern, date_clause, logic):
        if not pattern:
            raise Exception("Must specify search term using search=")

        filters = ','.join([FILTER % {"pattern": p} for p in pattern])
        lucene = LUCENE % {"filters": filters, "logic": logic}
        where = "WHERE source='{}' and lucene='{}'".format(advertiser, lucene)

        q = QUERY.format(selects) + where
        print q

        data = self.cassandra.execute(q,None,60)
        df = pandas.DataFrame(data)
        return df

    @tornado.web.asynchronous
    def get(self, api_type):
        logic = self.get_argument("logic", "should")
        terms = self.get_argument("search", False)
        formatted = self.get_argument("format", False)
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        advertiser = self.get_argument("advertiser", "")

        date_clause = self.make_date_clause("timestamp", date, start_date, end_date)

        if terms:
            terms = terms.split(',')

        if formatted:
            if api_type=="uids":
                self.get_uids(
                    advertiser,
                    terms,
                    date_clause,
                    logic=logic
                    )
            elif api_type == "urls":
                self.get_urls(
                    advertiser,
                    terms,
                    date_clause,
                    logic=logic
                    )
            elif api_type=="count":
                self.get_count(
                    advertiser,
                    terms,
                    date_clause,
                    logic=logic
                    )
            elif api_type=="timeseries":
                self.get_timeseries(
                    advertiser,
                    terms,
                    date_clause,
                    logic=logic
                    )
            else:
                raise Exception("Invalid api call")
        else:
            self.get_content(pandas.DataFrame())

        
