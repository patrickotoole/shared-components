import tornado.web
import ujson
import pandas
import logging

from lib.helpers import decorators
from lib.helpers import *

#from cassandra import ReadTimeout


class SearchHelpers(object):

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


