import tornado.web
import pandas
import logging

from search_base import SearchBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

class SearchHandler(SearchBase):

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

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self, api_type):
        advertiser = self.current_advertiser_name

        _logic = self.get_argument("logic", "or")
        terms = self.get_argument("search", False)
        formatted = self.get_argument("format", False)
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
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


