import tornado.web
import ujson
import pandas
import StringIO
import logging

import re

from ..base import BaseHandler
from analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *

class VisitDomainsFullHandler(BaseHandler,AnalyticsBase):

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

    def full_get_w_in(self, uids, date_clause):
        DOMAIN_SELECT = "select * from full_domain_test"
        DOMAIN_SELECT2 = "select * from full_domain_test where uid in (%s)" 

        str_uids = [str(u) for u in uids]
        uids_split = "'" + "','".join(str_uids)+"'"
        logging.info("Visit domains full prepping statement")
        
        results = self.db.select_dataframe(DOMAIN_SELECT2 % uids_split)

        logging.info("QCassFull")

        return results

    def full_get_w_agg_in(self, uids, date_clause):
        DOMAIN_SELECT2 = "select * from full_domain_test where uid in (%s)"
        str_uids = [str(u) for u in uids]
        uids_split = "'" + "','".join(str_uids)+"'"
        logging.info("Visit domains full prepping statement")
        results = self.db.select_dataframe(DOMAIN_SELECT2 % uids_split)
        #results = results.groupby(["url"]).apply(lambda x: pandas.Series({'num_uids':len(x['uid'].unique())}))
        def aggDF(row):
            return {"count":len(row), "uniques":len(set(row))}
        if len(results)>0:
            df = results.groupby(["url"])["uid"].apply(aggDF)
            final_results = df.unstack(1).reset_index()
            logging.info("QAggCassFull")
        else:
            final_results = pandas.DataFrame()

        return final_results 

    @decorators.deferred
    def defer_get_domains_full(self, uids, date_clause,aggregate):
        where = []
        if aggregate:
            full_data = self.full_get_w_agg_in(uids, date_clause)
        else:
            full_data = self.full_get_w_in(uids, date_clause)
        df = pandas.DataFrame(full_data)

        return df

    @defer.inlineCallbacks
    def get_domains_full(self, uid, date_clause, kind, aggregate):
        uids = uid.split(",")
        df = yield self.defer_get_domains_full(uids, date_clause, aggregate)

        if len(df) > 0:
            if kind == "domains":
                df = df.groupby("domain").uid.nunique().reset_index()

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
        uid = self.get_argument("uid", [])
        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        kind = self.get_argument("kind", "")
        aggregate = self.get_argument("aggregate", False)

        logging.info("AGGREGATE = %s" % aggregate)

        date_clause = self.make_date_clause("date", date, start_date, end_date)

        if formatted:
            self.get_domains_full(
                uid,
                date_clause,
                kind,
                aggregate
                )
        else:
            self.get_content(pandas.DataFrame())

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def post(self):
        #print tornado.escape.json_decode(self.request.body)
        formatted = self.get_argument("format", False)
        payload = tornado.escape.json_decode(self.request.body)

        if "uids" not in payload:
            raise Exception("Please submit a json object containing a list of uids called 'uids'")

        start_date = self.get_argument("start_date", "")
        end_date = self.get_argument("end_date", "")
        date = self.get_argument("date", "")
        kind = self.get_argument("kind", "")
        aggregate = self.get_argument("aggregate", False)

        date_clause = self.make_date_clause("date", date, start_date, end_date)
        uid = ','.join(payload["uids"])

        if formatted:
            self.get_domains_full(
                uid,
                date_clause,
                kind,
                aggregate
                )
        else:
            self.get_content(pandas.DataFrame())
