import tornado.web
import pandas
import logging

from pattern_search_base import PatternSearchBase

class PatternSearchHandler(PatternSearchBase):

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


