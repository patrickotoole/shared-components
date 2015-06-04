from twisted.internet import defer

from lib.mysql.helpers import run_mysql_deferred
from lib.mysql.helpers import execute_mysql_deferred
from lib.helpers import *

import re
import tornado.web 
import logging
from copy import deepcopy

INSERT = """
INSERT INTO {}
({})
VALUES
({})
"""

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
    def update(self, query, callback=None):
        response = yield execute_mysql_deferred(self.db, query)
        if callback:
            callback(response)
        else:
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

    def get_insert_template(self, table_name, excludes=[]):
        df = self.db.select_dataframe("describe {}".format(table_name))
        variables = df[["field","type"]].set_index("field").to_dict(orient="dict")["type"]

        for e in excludes:
            del variables[e]

        placeholders = []

        p = re.compile("(timestamp|varchar).*")
        for k,v in variables.iteritems():
            if p.match(v):
                placeholders.append('"%({})s"'.format(k))
            else:
                placeholders.append('%({})s'.format(k))
        
        schema = ','.join(variables)
        values = ','.join(placeholders)

        query = INSERT.format(table_name, schema, values)

        return query
