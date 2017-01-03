import pandas
import logging
from lib.helpers import *
from twisted.internet import defer
from ...domains.base_domain_handler import BaseDomainHandler

def get_idf(db,domain_set):
    QUERY = """
        SELECT p.domain, max(p.num_users) as num_users, p.idf, p.category_name, c.parent_category_name 
        FROM reporting.pop_domain_with_category p 
        JOIN category c using (category_name) 
        WHERE domain in (%(domains)s)
        group by domain    
    """

    domain_set = [i.encode("utf-8") for i in domain_set]
    domains = domains = "'" + "','".join(domain_set) + "'"

    return db.select_dataframe(QUERY % {"domains":domains})



def check_required_days(df,num_days):
    REQUIRED_CACHE_DAYS = num_days if num_days < 7 else 7
    assert(df.applymap(lambda x: x > 0).sum().sum() > REQUIRED_CACHE_DAYS) 

def group_sum_sort_np_array(arr,key,sortby="count"):
    import itertools

    df = pandas.DataFrame(list(itertools.chain.from_iterable(arr)))
    return df.groupby(key).sum().reset_index().sort_index(by=sortby,ascending=False)

def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates

def build_count_dataframe(field):
    def build(data):
        try:
            return pandas.DataFrame(data).rename(columns={"count":field}).set_index("date")
        except:
            # hack: for the null case build an empty df
            df = pandas.DataFrame([[0,0]],columns=[field,"date"]).set_index("date")
            df = df[df[field] > 0]
            return df

    return build

def build_dict_dataframe(field):

    def formatter(data):
        keys = data.keys()
        df = pandas.DataFrame({field:keys},index=keys)
        for date, dl in data.iteritems():
            df.T[date][field] = dl
        return df

    return formatter


class PatternSearchHelpers(BaseDomainHandler):

    @defer.inlineCallbacks
    def deferred_reformat_stats(self,domain_stats_df,url_stats_df):
        deferred_list = defer.DeferredList([
            self.url_stats_to_urls(url_stats_df),
            self.domain_stats_to_domains(domain_stats_df)
        ])

        results = yield deferred_list
        urls    = results[0][1]
        domains = results[1][1]

        defer.returnValue([urls,domains])


    @decorators.deferred
    def url_stats_to_urls(self,url_stats_df):
        import time
        start = time.time()
        if len(url_stats_df):
            df = group_sum_sort_np_array(url_stats_df['urls'].values,"url")
            print start - time.time()
            return df
        else:
            return pandas.DataFrame()


    def head_and_tail(self,l):
        return (l[0], l[1:])

    def group_count_view(self,df,terms,indices):
        df = df.groupby(indices).agg({"uid":len})
        df = df.rename(columns={"uid":"num_views"})
        df['terms'] = ",".join(terms)
        return df

    def pattern_and(self,df,pattern_terms):
        uids = df.groupby("uid").agg({
            "terms": lambda x: set(x) == set([",".join(p) for p in pattern_terms])
        })
        intersection = uids[uids.terms == True].index
        df = df[df.uid.isin(intersection)]
        return df


    def urls_to_actions(self,patterns,urls, actions, AhoCor):

        def check(url):
            def _run(x):
                return x in url
            return _run

        #p = patterns.url_pattern
        results = dict(zip(urls, [[] for x in urls]))
        for items in actions:
            filter_dict = self.run_filter_url(self.get_filter_checker(items['action_id']), urls)
            for key in filter_dict.keys():
                if filter_dict[key]:
                    results[key].append(items['action_name'])
            
        logging.info("finished dict")
        url_to_action = pandas.DataFrame(pandas.Series(results),columns=["actions"])
        url_to_action.index.name = "url"

        return url_to_action
    
    def get_pixels(self):
        Q = "SELECT * from action_with_patterns where pixel_source_name = '%s'"
        pixel_df = self.db.select_dataframe(Q % self.current_advertiser_name)
        return pixel_df
