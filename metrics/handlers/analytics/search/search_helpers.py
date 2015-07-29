import tornado.web
import ujson
import pandas
import logging

from lib.helpers import decorators
from lib.helpers import *

#from cassandra import ReadTimeout
from cassandra import OperationTimedOut

QUERY = "SELECT {} FROM rockerbox.visit_uids_lucene "
LUCENE = """{ filter: { type: "boolean", %(logic)s: [%(filters)s]}}"""
FILTER = """{ type:"wildcard", field: "url", value: "*%(pattern)s*"}"""

class SearchBaseHelpers(object):

    def default_response(self,terms,logic):
 
        response = {
            "search": terms, 
            "logic": logic, 
            "results": [],
            "summary": {}
        }

        return response

    def write_json(self, data):
        self.write(ujson.dumps(data))
        self.finish()

    def write_timeout(self, terms, logic, timeout):
        response = [
            {
                "search": terms,
                "logic": logic,
                "timeout": timeout,
                "error":"Timeout. Try making your query more specific"
            }
        ]
        self.write_json(response)

    @decorators.deferred
    def defer_execute(self, selects, advertiser, pattern, date_clause, logic, 
                      timeout=60):
        if not pattern:
            raise Exception("Must specify search term using search=")

        filters = ','.join([FILTER % {"pattern": p} for p in pattern])
        lucene = LUCENE % {"filters": filters, "logic": logic}
        where = "WHERE source='{}' and lucene='{}'".format(advertiser, lucene)

        q = QUERY.format(selects) + where
        print q
        
        try:
            data = self.cassandra.execute(q,None,timeout=timeout)
        except OperationTimedOut:
            return False

        df = pandas.DataFrame(data)
        return df

    def group_and_count(self, df, groups, value, colname):
        cols = groups + [value]

        d = df[cols].groupby(groups)
        
        # Note: this lambda may look hacky, but it is MUCH faster than nunique
        d = d.agg({value: lambda x: len(set(x))})
        d = d.reset_index()
        d = d.sort(value, ascending=False)
        
        if value != colname:
            d[colname] = d[value]
            del d[value]
        return d


