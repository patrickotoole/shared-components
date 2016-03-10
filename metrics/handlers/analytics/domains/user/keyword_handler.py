import tornado.web
import ujson
import pandas
import StringIO
import logging

import re

from link import lnk
from handlers.base import BaseHandler
from ...analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *
from ..base import VisitDomainBase

class KeywordUserHandler(BaseHandler, AnalyticsBase, VisitDomainBase):

    def initialize(self, db=None, cassandra=None, **kwargs):
        self.logging = logging
        self.db = db
        self.DOMAIN_SELECT = "select uid, domain, timestamp from rockerbox.visitor_domains_full where uid = ?"
        self.cassandra = cassandra
        self.limit = None



    @decorators.deferred
    def defer_get_onsite_domains(self, date, advertiser, uids):
        date_clause = self.make_date_clause("date",date,"","")
        results = self.get_domains_use_futures(uids, date_clause)
        df = pandas.DataFrame(results)

        return df

    @decorators.deferred
    def process_visitor_domains(self, response_data):
        def split_url(x):
            return x.replace("-","/").split("/")

        GROUPS = ["domain", "uid"]
        EXPAND_BY = "domain"
        def grouping_function(x):
            # want to return a series (or dataframe) that has our new expanded series as the index
            the_grouped = x[EXPAND_BY].iloc[0]
            split_version = split_url(the_grouped)
            values = x["uid"].count()
            return pandas.DataFrame(values,columns=["unique"],index=split_version)
        
        obj1 = response_data.groupby(GROUPS).apply(grouping_function)
        obj2 = obj1.groupby(level=2)

        obj3 = pandas.DataFrame(obj2["unique"].sum())
        full_url_response = obj3.reset_index().sort(columns=["unique"], ascending=False)
        full_url_response.columns = ["url", "uniques"]

        mask1 = ~full_url_response['url'].str.contains("http")
        mask2 = ~full_url_response['url'].str.contains(".co")
        mask3 = ~full_url_response['url'].str.contains(".org")
        
        filtered_df = full_url_response[mask1 & mask2 & mask3]

        self.get_content(filtered_df)


    @defer.inlineCallbacks
    def get_onsite_domains(self, date, kind, advertiser, num_keyword, uids):
        
        logging.info("Requesting visitor domains...")
        response_data = yield self.defer_get_onsite_domains(date, advertiser, uids)
        logging.info("Received visitor domains.")

        logging.info("Processing visitor domains...")
        visitor_domains = yield self.process_visitor_domains(response_data)
        logging.info("Finished processing visitor domains...")

        
        

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        kind = self.get_argument("kind", "")
        uid = self.get_argument("uid", [])
        user = self.current_advertiser_name
        num_keywords = self.get_argument("num_keywords", 3)

        try:
            keywords = int(num_keywords) - 1
        except:
            keywords = 3

        uids = uid.split(",")

        date_clause = self.make_date_clause("date", date, start_date, end_date)
        if formatted:
            self.get_onsite_domains(
                date_clause,
                kind,
                user,
                keywords,
                uids
                )
        else:
            self.get_content(pandas.DataFrame())

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def post(self):

        formatted = self.get_argument("format", False)
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        kind = self.get_argument("kind", "")
        user = self.current_advertiser_name
        num_keywords = self.get_argument("num_keywords", 3)

        try:
            keywords = int(num_keywords) - 1
        except:
            keywords = 3
 
        if "uids" not in payload:
            raise Exception("Please submit a json object containing a list of uids called 'uids'")


        date_clause = self.make_date_clause("date", date, start_date, end_date)

        uid = ','.join(payload["uids"])

        if formatted:
            self.get_onsite_domains(
                date_clause,
                kind,
                user,
                keywords,
                uids
                )
        else:
            self.get_content(pandas.DataFrame())
