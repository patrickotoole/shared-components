import tornado.web
import pandas
import logging
import re

from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_cache.helpers import *
from helpers import *
from cassandra import VisitDomainCassandra


class VisitDomainBase(VisitDomainCassandra):

    @decorators.deferred
    def defer_get_domains(self, uids, date_clause):
        xx = self.get_domains_use_futures(uids, date_clause)
        df = pandas.DataFrame(xx)
        return df

    @decorators.deferred
    def defer_get_uid_domains(self, source, pattern, uids, date_clause):

        xx = self.get_domains_use_futures(uids, date_clause)
        df = pandas.DataFrame(xx)

        df['domain'] = df.domain.map(lambda x: re.sub("^m\.","",x.lower()))

        domain_counts = df.groupby("domain").count()
        domains = list(domain_counts[domain_counts.uid > 0].index)

        df = df[df.domain.isin(domains) & (df.domain != "na")]
        df = filter_fraud(df)
        
        series = df.groupby(["uid","domain"])["domain"].agg(lambda x: len(x))
        series.name = "exists"

        return series
 
    @decorators.deferred
    def defer_get_domains_by_date(self, source, pattern, uids, date_clause):

        xx = self.cache_select(source, pattern, date_clause)
        if len(xx) == 0:
            xx = self.get_domains_use_futures(uids, date_clause)
        else:
            print "ASDF"

        df = pandas.DataFrame(xx)
        df['date'] = df['timestamp'].map(lambda x: x.split(" ")[0] + " 00:00:00")
        df = filter_fraud(df)
        df = df.groupby(["domain","date"])['uid'].agg( {
            "count":lambda x: len(set(x)),
            "views": len
        }).reset_index()
        
        return df

    @decorators.deferred
    def defer_get_domains_with_cache(self, source, pattern, uids, date_clause):

        xx = self.cache_select(source, pattern, date_clause)
        if len(xx) == 0:
            xx = self.get_domains_use_futures(uids, date_clause)

        df = pandas.DataFrame(xx)
        try:
            df = filter_fraud(df)

            df['occurrence'] = df['count']
            df = df.groupby("domain")[["occurrence"]].sum().reset_index().sort_index(by="occurrence",ascending=False)
            df = df.head(100)
        except:
            pass

        return df


    
    
    
