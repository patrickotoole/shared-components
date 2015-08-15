import tornado.web
import pandas
import logging

from multi_pattern_search_base import MultiPatternSearchBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

class MultiPatternSearchHandler(MultiPatternSearchBase):

    LOGIC = {
        "funnel":"intersection",
        "union":"union"
    }

    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None
        self.TYPE = {
            "uids": self.get_uids,
            "count": self.get_count,
            "domains": self.get_domains
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

    def parse_pattern(self,s,logic="must"):
        return {
            "patterns":s.split(","),
            "logic": logic
        }

    def parse_pattern_group(self,s,logic="union"):
        return {
            "pattern_groups":[self.parse_pattern(p) for p in s.split("|")],
            "logic": logic
        }

    def parse_multi_pattern(self,s,logic="funnel"):
        return {
            "steps":[self.parse_pattern_group(g) for g in s.split(">")],
            "logic": logic
        }



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

        logic = self.LOGIC.get(_logic,"intersection")
        
        if terms:
            terms = self.parse_multi_pattern(terms,logic)

        fn = self.TYPE.get(api_type,self.invalid)
        fn(advertiser, terms, date_clause, timeout=int(timeout))


