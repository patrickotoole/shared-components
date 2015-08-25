import tornado.web
import pandas
import logging

from handlers.analytics.search.multi_search import MultiSearchHandler
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from funnel_database import FunnelDatabase
from funnel_auth import FunnelAuth

class FunnelSearchHandler(MultiSearchHandler, FunnelDatabase, FunnelAuth):

    def funnel_to_search(self, funnel_id):
        '''Given a funnel ID, return a string that can be used to interact with
        the search APIs
        '''

        funnel = self.get_funnel(funnel_id)[0]
        patterns = [a["url_pattern"] for a in funnel["actions"]]

        action_strings = []
        for pattern in patterns:
            p = []
            for term in pattern:
                p.append(','.join(term.split(" ")))
            action_strings.append(p)

        pattern_strings = []
        for ps in action_strings:
            if isinstance(ps, list):
                pattern_strings.append('|'.join(ps))
            else:
                pattern_strings.append(ps)

        funnel_string = ">".join(pattern_strings)
        self.logging.info("Funnel String: %s" % funnel_string)

        return funnel_string

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self, api_type):
        advertiser = self.current_advertiser_name

        _logic = self.get_argument("logic", "or")
        formatted = self.get_argument("format", False)
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        timeout = self.get_argument("timeout", 60)
        funnel_id = self.get_argument("id")

        date_clause = self.make_date_clause("timestamp", date, start_date, end_date)

        logic = self.LOGIC.get(_logic,"intersection")
        
        if funnel_id:
            search = self.funnel_to_search(funnel_id)
            terms = self.parse_multi_pattern(search,logic)
            print "Terms: %s" % terms
        fn = self.TYPE.get(api_type,self.invalid)
        fn(advertiser, terms, date_clause, timeout=int(timeout))
