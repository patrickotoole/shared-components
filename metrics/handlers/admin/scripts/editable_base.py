from twisted.internet import defer

from lib.mysql.helpers import run_mysql_deferred
from lib.mysql.helpers import execute_mysql_deferred
from lib.helpers import *

import tornado.web 
import logging
from copy import deepcopy

class EditableBase(object):
    """
    The non-tornado specific base functions

    Should not be used on it own, but rather needs to be inherited 
    and constants need to overridden
    """


class EditableBaseHandler(tornado.web.RequestHandler, EditableBase):
    """
    Base handler for admin reporting
    """

    @defer.inlineCallbacks
    def get_data(self, query):
        df = yield run_mysql_deferred(self.db, query)
        self.get_content(df)

    def make_query(self, get_query):
        where = self.make_where()
        if not where:
            where = "1=1"
        self.query = get_query.format(where)
        return self.query

    def respond(self):
        def default(self):
            self.write("Something")
        yield default

    @defer.inlineCallbacks
    def update(self, query):
        yield execute_mysql_deferred(self.db, query)
        self.respond()

    def make_update(self, update_query, pk):
        print self.request.body
        col_to_change = self.get_argument("name")
        value = self.get_argument("value")

        set_clause = '{} = "{}"'.format(col_to_change, value)

        return update_query.format(set_clause, pk)

    def make_where(self):
        # If no params, just return a placeholder
        if not self.params:
            return "1=1"

        where = ['{} = "{}"'.format(k, v) for (k,v) in self.params.iteritems() if v]
        return ' and '.join(where)
