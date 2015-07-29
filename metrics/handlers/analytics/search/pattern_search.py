import tornado.web
import pandas
import logging

from search_base import SearchBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

class PatternSearchHandler(SearchBase):

    LOGIC = {
        "or":"should",
        "and":"must"
    }

    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None
        self.TYPE = {
            "uids": self.get_uids,
            "count": self.get_count,
            "timeseries": self.get_timeseries
        }

    def invalid(self,*args,**kwargs):
        raise Exception("Invalid api call")

    def head_and_tail(self,l):
        return (l[0], l[1:])

    def combine_frames(self,d1,d2,index,how="or"):

        return d1.append(d2)

    def calc_users(self,df):
        return pandas.Series({"num_users":len(set(df.uid.values))})

    def calc_visits(self,df):
        return pandas.Series({"num_visits":len(df.groupby(["url","uid"]))})

    def calc_views(self,df):
        return pandas.Series({"num_views":df.num_views.sum()})

    def calc_stats(self,df):
        return pandas.Series({
            "num_users":len(set(df.uid.values)),
            "num_visits":len(df.groupby(["url","uid"])),
            "num_views":df.num_views.sum()
        })


    @defer.inlineCallbacks
    def get_count(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        PARAMS = "date, url, uid"
        indices = PARAMS.split(", ")

        response = self.default_response(pattern_terms,logic,no_results=True)
        response['summary']['num_users'] = 0

        terms, remaining_terms = self.head_and_tail(pattern_terms)
        
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
        df = df.groupby(indices).agg({"uid":len})
        df = df.rename(columns={"uid":"num_views"})
        df['terms'] = ",".join(terms)

        for terms in remaining_terms:
            df2 = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
            df2 = df2.groupby(indices).agg({"uid":len})
            df2 = df2.rename(columns={"uid":"num_views"})
            df2['terms'] = ",".join(terms)
            df = df.append(df2)
            df = df.reset_index().drop_duplicates(indices).set_index(indices)

        df = df.reset_index()

        if len(df) > 0:
            # Get the user counts for each date, date/url
            views = df.groupby("date").apply(self.calc_views)
            visits = df.groupby("date").apply(self.calc_visits)
            users = df.groupby("date").apply(self.calc_users)

            stats = df.groupby("date").apply(self.calc_stats)

            # Get the total number of visits, users
            response['summary']['num_views'] = views.num_views.sum()
            response['summary']['num_visits'] = visits.num_visits.sum()
            response['summary']['num_users'] = len(set(df.uid.values))

            response['summary']['num_views_stats'] = stats.num_views.sum()
            response['summary']['num_visits_stats'] = stats.num_visits.sum()

            
            # Make a timeseries for each unique url visits
            #del visits["url"] # get rid of string since we dont need the name
            #visits_ts = visits.groupby("date").sum().sort().reset_index()
            
            # Combine the users/visits counts for each date
            #results = visits_ts.set_index("date")
            #results = results.join(users.set_index("date")).reset_index()
            #results = Convert.df_to_values(results)

            #response['results'] = results
        
        self.write_json(response)


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

        logic = _logic
        
        if terms:
            pattern_terms = [p.split(",") for p in terms.split('|')]

        fn = self.TYPE.get(api_type,self.invalid)
        fn(advertiser, pattern_terms, date_clause, logic=logic, timeout=int(timeout))


