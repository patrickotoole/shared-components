import tornado.web
import ujson
import pandas
import logging

from lib.helpers import decorators
from lib.helpers import *


class SearchHelpers(object):
    # These are helperrs for actually serving HTTP responses and formatting responses


    def default_response(self,terms,logic,no_results=False):
 
        response = {
            "search": terms, 
            "logic": logic, 
            "results": [],
            "summary": {}
        }

        if no_results: del response['results']

        return response

    def write_json(self, data):
        Render.compressWrite(self,ujson.dumps(data))

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

class SearchCassandraHelpers(object):
    # These are helpers used to help with reading data from cassandra

    @staticmethod
    def wrapped_select_callback(field):

        def _format(uid,date,url,occurrence,advertiser,pattern):
            return { 
                "uid":uid, 
                "date":date, 
                "url":url, 
                "occurrence":occurrence, 
                "source":advertiser, 
                "action":",".join(pattern), 
                "u1":uid[-2:] 
            }
    
        def select_callback(result,advertiser,pattern,results,*args):
            result = result[0]
            res = result["rockerbox." +field]
            date = result["date"]
            for url_uid in res:
                if "[:]" in url_uid:
                    url, uid = url_uid.split("[:]")
                    reconstructed = []
                    
                    for i in range(0,int(res[url_uid])):
                        h = _format(uid,date,url,i,advertiser,pattern)
                        reconstructed += [h]
        
                    results += reconstructed
    
        return select_callback
    
    @staticmethod
    def cache_callback(result,advertiser,pattern,results,*args):
        extra = []
        for res in result:
            extra += [res]*res['occurrence']
    
        results += result
        results += extra
    
    @staticmethod
    def sufficient_limit(size=300):
    
        def suffices(x):
            _, _, result = x
            print len(result)
            return len(result) > size
    
        return suffices
