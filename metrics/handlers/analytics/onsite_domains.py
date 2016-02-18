import tornado.web
import ujson
import pandas
import StringIO
import logging

import re

from link import lnk
from ..base import BaseHandler
from analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *
from search.cache.pattern_search_cache import PatternSearchCache

class OnsiteDomainsHandler(BaseHandler, AnalyticsBase, PatternSearchCache):

    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.limit = None

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.render("analysis/visit_urls.html", data=df)
        yield default, (data,)    

    @decorators.deferred
    def defer_get_onsite_domains(self, date, advertiser, pattern):
        dates = build_datelist(7)
        args = [advertiser,pattern,dates]
        
        uids = self.get_uids_from_cache(*args)
        uids = list(set([u['uid'] for u in uids]))
        
        crusher_api = lnk.api.crusher
        crusher_api.user="a_"+advertiser
        crusher_api.password="admin"
        crusher_api.base_url="http://192.168.99.100:8888"
        crusher_api.authenticate()
        
        data_obj = {"uids":uids}
        response_data = crusher_api.post('/crusher/visit_domains_full?format=json&aggregate=True', data = ujson.dumps(data_obj))
        
        return response_data.text


    @defer.inlineCallbacks
    def get_onsite_domains(self, date, kind, advertiser, pattern):
        
        response_data = yield self.defer_get_onsite_domains(date, advertiser, pattern)
        
        df = pandas.DataFrame(ujson.loads(response_data))
        self.get_content(df)

    def make_date_clause(self, variable, date, start_date, end_date):
        params = locals()

        for i in ["date", "start_date", "end_date"]:
            params[i] = self.format_timestamp(params[i])

        if date:
            return "%(variable)s = '%(date)s'" % params
        elif start_date and end_date:
            return "%(variable)s >= '%(start_date)s' AND %(variable)s <= '%(end_date)s'" % params
        elif start_date:
            return "%(variable)s >= '%(start_date)s'" % params
        elif end_date:
            return "%(variable)s <= '%(end_date)s'" % params
        else:
            return ""
    
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        kind = self.get_argument("kind", "")
        url_pattern = self.get_argument("url_pattern", "")
        user = self.current_advertiser_name

        date_clause = self.make_date_clause("date", date, start_date, end_date)

        if formatted:
            self.get_onsite_domains(
                date_clause,
                kind,
                user,
                url_pattern
                )
        else:
            self.get_content(pandas.DataFrame())
