import tornado.web
import pandas
import logging

from base import PatternSearchBase

class PatternSearchHandler(PatternSearchBase):

    def initialize(self, db=None, cassandra=None, zookeeper=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.zookeeper = zookeeper
        self.limit = None
        self.TYPE = {
            "uid_domains": self.get_uid_domains,
            "uids": self.get_uids,
            "count": self.get_count,
            "timeseries": self.get_timeseries
        }

    def invalid(self,*args,**kwargs):
        raise Exception("Invalid api call")


    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self, api_type):
        advertiser = self.current_advertiser_name
        _logic = self.get_argument("logic", "or")
        terms = self.get_argument("search", False)
        formatted = self.get_argument("format", False)
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        num_days = self.get_argument("num_days", 20)

        date = self.get_argument("date", "")
        timeout = self.get_argument("timeout", 60)

        date_clause = self.make_date_clause("timestamp", date, start_date, end_date)

        logic = _logic
        
        if terms:
            pattern_terms = [p.split(",") for p in terms.split('|')]

        fn = self.TYPE.get(api_type,self.invalid)
        fn(advertiser, pattern_terms, int(num_days), logic=logic, timeout=int(timeout))

