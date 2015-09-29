import pandas
import logging

from search_base import SearchBase

class PatternSearchHelpers(object):

    def head_and_tail(self,l):
        return (l[0], l[1:])

    def calc_stats(self,df):

        # THIS DOES THE SAMPLING TRANSFORMATION
        multiplier = 100/self.sample_used if self.sample_used else 1
        series = df["url"] + df["uid"]
        
        return pandas.Series({
            "uniques":len(df.uid.unique())*multiplier,
            "visits":len(series.unique())*multiplier,#len(df.groupby(["url","uid"])),
            "views":len(df)*multiplier#.num_views.sum()
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

