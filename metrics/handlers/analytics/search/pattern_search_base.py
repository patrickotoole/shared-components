import tornado.web
import tornado.gen
import pandas
import logging
import time

from search_base import SearchBase
from pattern_search_helpers import PatternSearchHelpers
from pattern_search_cache import PatternSearchCache
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *


from ..visit_domains import VisitDomainBase


def callback(yo,*args):
    print yo
    import ipdb; ipdb.set_trace()
    time.sleep(10)
    print yo
    return

def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates

def build_count_dataframe(field):
    return lambda data: pandas.DataFrame(data).rename(columns={"count":field}).set_index("date")

def build_dict_dataframe(field):

    def formatter(data):
        keys = data.keys()
        df = pandas.DataFrame({field:keys},index=keys)
        for date, dl in data.iteritems():
            df.T[date][field] = dl
        return df

    return formatter
 


class PatternSearchBase(VisitDomainBase, SearchBase,PatternSearchHelpers, PatternSearchCache):


    def build_deferred_list(self, terms_list, params, advertiser, date_clause, logic="must"):
        dl = []
        for terms in terms_list:
            dl += [self.defer_execute(params, advertiser, terms, date_clause, logic)]
        
        return defer.DeferredList(dl)


    @defer.inlineCallbacks
    def get_uids(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        PARAMS = "uid"
        indices = [PARAMS]

        response = self.default_response(pattern_terms,logic)
        response['summary']['num_users'] = 0

        terms, remaining_terms = self.head_and_tail(pattern_terms)
        
        # PUSH all the data into one dataframe
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
        df['terms'] = ",".join(terms)

        for terms in remaining_terms:
            df2 = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
            df2['terms'] = ",".join(terms)

            df = df.append(df2)
            df = df.drop_duplicates()

        df = df.reset_index()

        # APPLY "and" logic if necessary
        if logic == "and":
            df = self.pattern_and(df,pattern_terms)

        # PREPARE the final version of the data for response
        if len(df) > 0:
            response['results'] = list(set(df.uid.values))
            response['summary']['num_users'] = len(response['results'])
            
        
        self.write_json(response)

            
    @defer.inlineCallbacks
    def get_generic(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60,timeseries=False):
        
        PARAMS = "date, url, uid"
        indices = PARAMS.split(", ")

        response = self.default_response(pattern_terms,logic,no_results=True)
        response['summary']['num_users'] = 0

        import time
        start = time.time()
        dates = build_datelist(20)
        args = [advertiser,pattern_terms[0][0],dates]

        try:
            stats_df = self.get_stats(*args)

            assert(len(stats_df) >= 14)
            print start - time.time()

            args[-1] = build_datelist(7)

            domains_df = self.get_domains_from_cache(*args, formatter=build_dict_dataframe("domains"))
            urls_df = self.get_urls_from_cache(*args, formatter=build_dict_dataframe("urls"))

            df = stats_df.join(domains_df).join(urls_df)
            summarized = stats_df.sum()

            response['summary']['users'] = summarized.uniques
            response['summary']['views'] = summarized.views
            response['summary']['visits'] = summarized.visits

            if timeseries:
                results = Convert.df_to_values(stats_df.reset_index())
                response['results'] = results

            import itertools

            print start - time.time()

            urls_df_no_ts = pandas.DataFrame(list(itertools.chain.from_iterable(urls_df['urls'].values)))
            domains_df_no_ts = pandas.DataFrame(list(itertools.chain.from_iterable(domains_df['domains'].values)))

            print start - time.time()

            response['urls'] = Convert.df_to_values(urls_df_no_ts.groupby("url").sum().reset_index().sort_index(by="count",ascending=False).head(3000))
            print start - time.time()

            response['domains'] = Convert.df_to_values(domains_df_no_ts.groupby("domain").sum().reset_index().sort_index(by="count",ascending=False).head(3000))
            print start - time.time()

        except Exception as e:

            frames = yield self.build_deferred_list(pattern_terms, PARAMS, advertiser, date_clause)
            dfs = []

            
            for terms, result in zip(pattern_terms,frames):
                df = (yield result)[1]
                if len(df) > 0: 
                    dfs += [df]
            
            if len(dfs):

                df, tail = self.head_and_tail(dfs)

                for df2 in tail:
                    df = df.append(df2)
                    df = df.reset_index().drop_duplicates(indices).set_index(indices)

                df = df.reset_index()

            else:
                df = pandas.DataFrame([[0,0,0]],columns=["uid","num_views","date"]).ix[1:]
                response['results'] = []

            # APPLY "and" logic if necessary
            if logic == "and":
                df = self.pattern_and(df,pattern_terms)


            # PREPARE the final version of the data for response
            if len(df) > 0:
                stats = df.groupby("date").apply(self.calc_stats)

                response['summary']['num_urls'] = len(set(df.url.values))
                response['summary']['num_users'] = len(set(df.uid.values))
                response['summary']['num_views'] = stats.views.sum()
                response['summary']['num_visits'] = stats.visits.sum()
                
                if timeseries:
                    results = Convert.df_to_values(stats.reset_index())
                    response['results'] = results


                urls = self.get_urls_from_cache(advertiser,pattern_terms[0][0],build_datelist(20))

                response['urls'] = []
                for l in urls.values():
                    response['urls'] += l


                if len(urls) == 0:

                    df['count'] = df['occurrence'].map(lambda x: 1 if x == 0 else x)
                    grouped_urls = df.groupby("url")['count'].sum()
                    url_list = grouped_urls.reset_index().sort_index(by="count",ascending=False).T.to_dict().values()
                    response['urls'] = url_list


                # GET DOMAINS (from cache)
                defs = [self.defer_get_domains_with_cache(advertiser,pattern_terms[0][0],list(set(df.uid.values))[:1000],date_clause)]
                dl = defer.DeferredList(defs)
                dom = yield dl
                if hasattr(dom[0][1],"uid"):
                    df = dom[0][1].groupby("domain")['uid'].agg(lambda x: len(set(x)))
                    domains = df.reset_index().rename(columns={"uid":"count"}).T.to_dict().values()
                else:
                    domains = dom[0][1].reset_index().rename(columns={"occurrence":"count"}).T.to_dict().values()
               
                response['domains'] = domains
        
        self.write_json(response)


    def get_count(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout)


    def get_stats(self, *args):

        start = time.time()

        visits_df  = self.get_visits_from_cache(*args, formatter=build_count_dataframe("visits"))
        print start - time.time()


        views_df   = self.get_views_from_cache(*args, formatter=build_count_dataframe("views"))
        print start - time.time()

        uniques_df = self.get_uniques_from_cache(*args, formatter=build_count_dataframe("uniques"))
        print start - time.time()

        df = views_df.join(visits_df).join(uniques_df)

        return df



    def get_timeseries(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout, True)


