import pandas
import logging

from search_base import SearchBase

class PatternSearchHelpers(object):

    def head_and_tail(self,l):
        return (l[0], l[1:])

    def calc_stats(self,df):
        return pandas.Series({
            "num_users":len(set(df.uid.values)),
            "num_visits":len(df.groupby(["url","uid"])),
            "num_views":df.num_views.sum()
        })

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

