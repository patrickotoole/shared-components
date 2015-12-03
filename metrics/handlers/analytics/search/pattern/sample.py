import pandas
from ..search_base import SearchBase
from helpers import PatternSearchHelpers

from twisted.internet import defer

class PatternSearchSample(SearchBase, PatternSearchHelpers):
    
    def raw_to_stats(self,df,dates):
        stats_df = df.groupby("date").apply(self.calc_stats)
        for d in dates:
            if d not in stats_df.index:
                stats_df.ix[d] = 0

        def transform_urls(x):
            return [
                {"url":i,"count":j} for i,j in 
                (x.groupby("url").occurrence.sum() + 1).T.to_dict().items()
            ]

        url_stats_df = df.groupby("date").apply(transform_urls)
        url_stats_df.name = "urls"

        return (stats_df, pandas.DataFrame(url_stats_df))

    @defer.inlineCallbacks
    def sample_stats_onsite(self, term, params, advertiser, date_clause, numdays=20):
        df = yield self.defer_execute(params, advertiser, term, date_clause, "must", numdays=numdays)
        stats_df, url_stats_df = self.raw_to_stats(df,date_clause)
        defer.returnValue([df,stats_df,url_stats_df])

    @defer.inlineCallbacks
    def sample_stats_offsite(self, advertiser, term, uids, num_days=2):
        deferreds = [self.defer_get_domains_with_cache(advertiser,term,uids,num_days)]
        dl = defer.DeferredList(deferreds)

        dom = yield dl

        if hasattr(dom[0][1],"uid"):
            df = dom[0][1].groupby("domain")['uid'].agg(lambda x: len(set(x)))
            domains = df.reset_index().rename(columns={"uid":"count"})
        else:
            domains = dom[0][1].reset_index().rename(columns={"occurrence":"count"})

        def transform_domains(x):
            return [
                {"domain":i,"count":j} for i,j in 
                (x.groupby("domain")['count'].sum() + 1).T.to_dict().items()
            ]


        domain_stats_df = domains.groupby("date").apply(transform_domains)
        domain_stats_df.name = "domains"

        defer.returnValue(pandas.DataFrame(domain_stats_df))

        
 

 
