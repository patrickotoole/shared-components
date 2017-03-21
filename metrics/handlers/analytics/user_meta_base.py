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

QUERY = "SELECT uid, source, u2, browser, os, city, state FROM rockerbox.visit_events_uid_meta"

class UserMetaBaseHandler(object):

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

    def pull_from_meta(self,source, u2_uid):
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
        return data 

