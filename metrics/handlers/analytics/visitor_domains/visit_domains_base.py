import tornado.web
import pandas
import logging
import re

from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *


def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates

def filter_fraud(df):

    uids = df.groupby("uid")["uid"].count()
    bad_uids = list(uids[uids > 1000].index)

    bad_domain_uids = list(set(df[df.domain == "pennlive.com"].uid))
    df = df[~df.uid.isin(bad_uids) & ~df.uid.isin(bad_domain_uids)]

    return df

class VisitDomainBase(object):

    @decorators.deferred
    def defer_get_uid_visits(self, source, uids, term):
        xx = self.paginate_get_visits(uids, source)
        df = pandas.DataFrame(xx)
        filtered = df[df.url.map(lambda x: term in x)]

        return (filtered, df)

    @decorators.deferred
    def defer_get_uid_domains(self, source, pattern, uids, date_clause):

        xx = self.paginate_get_w_in(uids, date_clause)
        df = pandas.DataFrame(xx)

        df['domain'] = df.domain.map(lambda x: re.sub("^m\.","",x.lower()))

        domain_counts = df.groupby("domain").count()
        domains = list(domain_counts[domain_counts.uid > 15].index)

        df = df[df.domain.isin(domains) & (df.domain != "na")]
        df = filter_fraud(df)
        
        df = df.groupby(["uid","domain"])["domain"].agg(lambda x: len(x))
        df.name = "exists"


        return df

 
    @decorators.deferred
    def defer_get_domains_by_date(self, source, pattern, uids, date_clause):

        xx = self.cache_select(source, pattern, date_clause)
        if len(xx) == 0:
            xx = self.paginate_get_w_in(uids, date_clause)
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
    def defer_get_visits(self, source, pattern, uids, date_clause):

        xx = self.paginate_get_w_in(uids, date_clause)

        df = pandas.DataFrame(xx)
        try:
            df = filter_fraud(df)

            df['occurrence'] = df['count']
            df = df.groupby("domain")[["occurrence"]].sum().reset_index().sort_index(by="occurrence",ascending=False).head(100)
        except:
            pass

        return df




    @decorators.deferred
    def defer_get_domains_with_cache(self, source, pattern, uids, date_clause):

        xx = self.cache_select(source, pattern, date_clause)
        if len(xx) == 0:
            xx = self.paginate_get_w_in(uids, date_clause)
        else:
            print "ASDF"

        df = pandas.DataFrame(xx)
        try:
            df = filter_fraud(df)

            df['occurrence'] = df['count']
            df = df.groupby("domain")[["occurrence"]].sum().reset_index().sort_index(by="occurrence",ascending=False).head(100)
        except:
            pass

        return df


    def cache_select(self, source, pattern, date_clause):

        DOMAIN_SELECT = "select * from rockerbox.pattern_occurrence_domains_counter where source = ? and action = ? and date = ?"
        statement = self.cassandra.prepare(DOMAIN_SELECT)
        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)
       
        dates = build_datelist(14) 
        prepped = [[source,pattern,date] for date in dates]
        
        results = FutureHelpers.future_queue(prepped,execute,simple_append,60,[])
        results = results[0]

        return results


    
    @decorators.deferred
    def defer_get_domains(self, uids, date_clause):
        where = []
        xx = self.paginate_get_w_in(uids, date_clause)
        df = pandas.DataFrame(xx)

        return df

    def future_get_w_in(self,uids,date_clause):
        where = 'where uid IN {}'
        if date_clause:
            where = where + " and {}".format(date_clause)
        in_clause = self.make_in_clause(uids)
        WHERE = where.format(in_clause)
        logging.info("Started domains request for %s uids..." % len(uids))

        UERY = "SELECT * FROM rockerbox.visitor_domains_2 "
        query = QUERY + WHERE

        return self.cassandra.execute_async(query)
 
    def paginate_get_visits(self, uids, source):

        DOMAIN_SELECT = "select * from rockerbox.visit_events_source_uid_date_url where source = ? and uid = ?"
        statement = self.cassandra.prepare(DOMAIN_SELECT)
        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)

        logging.info("AXY")

        prepped = [[source, u] for u in uids]
        results, _ = FutureHelpers.future_queue(prepped,execute,simple_append,120,[],"DUMMY_VAR")

        logging.info("ASDF")

        return results



    def paginate_get_w_in(self, uids, date_clause):
        
        statement = self.cassandra.prepare(self.DOMAIN_SELECT)
        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)

        logging.info("AXY")

        prepped = [[u] for u in uids]

        results, _ = FutureHelpers.future_queue(prepped,execute,simple_append,120,[],"DUMMY_VAR")

        logging.info("ASDF")
        return results


