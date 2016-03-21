import tornado.web
import ujson
import pandas
import StringIO
import logging

import re

from link import lnk
from ..user.full_handler import VisitDomainsFullHandler
from handlers.base import BaseHandler
from ...analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *
from ...search.pattern.search import PatternSearchHandler

class VisitorDomainsHandler(PatternSearchHandler):

    def initialize(self, db=None, cassandra=None, zookeeper=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.zookeeper = zookeeper
        self.limit = None
        self.DOMAIN_SELECT = "SELECT uid, domain, timestamp FROM rockerbox.visitor_domains_full where uid = ?"
        self.fn = self.get_domains
        
    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        advertiser = self.current_advertiser_name
        _logic = self.get_argument("logic", "or")
        terms = self.get_argument("url_pattern", False)
        formatted = self.get_argument("format", False)
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        num_days = self.get_argument("num_days", 20)
        filter_id = self.get_argument("filter_id",False)

        date = self.get_argument("date", "")
        timeout = self.get_argument("timeout", 60)

        date_clause = self.make_date_clause("timestamp", date, start_date, end_date)

        logic = _logic

        if terms:
            pattern_terms = [p.split(",") for p in terms.split('|')]

        self.fn(advertiser, pattern_terms, int(num_days), logic=logic, timeout=int(timeout))
 
