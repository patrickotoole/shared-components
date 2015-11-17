import pandas
import logging

def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates

def build_count_dataframe(field):
    def build(data):
        return pandas.DataFrame(data).rename(columns={"count":field}).set_index("date")

    return build

def build_dict_dataframe(field):

    def formatter(data):
        keys = data.keys()
        df = pandas.DataFrame({field:keys},index=keys)
        for date, dl in data.iteritems():
            df.T[date][field] = dl
        return df

    return formatter


class PatternSearchHelpers(object):

    def head_and_tail(self,l):
        return (l[0], l[1:])

    def calc_stats(self,df):

        # THIS DOES THE SAMPLING TRANSFORMATION
        # HACK: see (self.sample_used)
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

