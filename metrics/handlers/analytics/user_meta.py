import tornado.web
import ujson
import pandas
import StringIO
import logging

from lib.cassandra_helpers.future_statement import *
from handlers.base import BaseHandler
from handlers.analytics.analytics_base import AnalyticsBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers

QUERY = "SELECT * FROM rockerbox.visit_events_uid_meta"

class UserMetaHandler(AnalyticsBase, BaseHandler):

    def initialize(self, db=None, cassandra=None, **kwargs):
        self.db = db
        self.cassandra = cassandra
        self.logging = logging

    def write_json(self, data):
        self.write(ujson.dumps(data))
        self.finish()

    @defer.inlineCallbacks
    def get_meta_data(self, advertiser, u2, uids):
        try:
            if uids:
                u2_uid = self.process_u2_uid(u2, uids)
            if u2 and not uids:
                df = yield self.defer_execute(u2)
            else:
                df = yield self.get_from_meta(advertiser, u2_uid)
            response = Convert.df_to_values(df)
            self.write_json(response)
        except Exception as e:
            self.write("{}")
            self.finish()
       
    def process_u2_uid(self, u2, uids):
        u2_uid = {}
        for x in range(0,100):
            if x < 10:
                u2_uid['0'+ str(x)]= [y for y in uids if int(str(y)[-2:]) == x]
            else:
                u2_uid[str(x)] = [y for y in uids if int(str(y)[-2:]) == x]
        return u2_uid

    PREPPED = {}

    def prepare_query(self,query):
        prepped_executor = self.PREPPED.get(query,False)

        if prepped_executor:
            return prepped_executor

        statement = self.cassandra.prepare(query)

        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)

        self.PREPPED[query] = execute

        return execute

    @decorators.deferred
    def get_from_meta(self,source, u2_uid):
        query = QUERY
        if source and u2_uid:
            query = query + " where source = ? and u2 = ? and uid in ?"
            execute = self.prepare_query(query)
            prepped = [[source] + [x, u2_uid[x]] for x in u2_uid.keys()]
        if not source:
            query = query + " where u2 = ? and uid in ?"
            execute = self.prepare_query(query)
            prepped = [[x, u2_uid[x]] for x in u2_uid.keys()]
        data, _ = FutureHelpers.future_queue(prepped,execute,simple_append,60,[],None)
        df=pandas.DataFrame(data)
        return df 

    @decorators.deferred
    def defer_execute(self,u2):
        where = " WHERE u2 = '%s'" % str(u2)
        q = QUERY + where
        self.logging.info(q)
        data = self.cassandra.execute(q)
        return pandas.DataFrame(data)

    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        advertiser = self.get_argument("advertiser", False)
        uid = self.get_argument("uid", False)
        u2 = self.get_argument("u2", False)
        uids = uid.split(",") if uid else []
        self.get_meta_data(advertiser, u2, uids)
