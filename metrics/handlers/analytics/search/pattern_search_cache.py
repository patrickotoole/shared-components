from lib.cassandra_cache.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers

def QueryU2(query):
    # Decorator for running a query with standard partitioning and u2 parameter strategy

    def wrapped(fn):

        INDEX = "source = ? and action = ? and date = ? and u2 = ? "
        def run(*args,**kwargs):
            kwargs['query'] = query + " WHERE " + INDEX
            return fn(*args,**kwargs)

        return run

    return wrapped



def Query(query):
    # Decorator for running a query with standard partitioning strategy

    def wrapped(fn):

        INDEX = "source = ? and action = ? and date = ? "
        def run(*args,**kwargs):
            kwargs['query'] = query + " WHERE " + INDEX
            return fn(*args,**kwargs)

        return run

    return wrapped

def formattable(fn):
    
    def run(*args,**kwargs):
        formatter = kwargs.get("formatter",False)
        transformer = kwargs.get("transformer",False)

        result = fn(*args,**kwargs)

        if formatter:
            result = formatter(result)

        if transformer:
            result = transformer(result)

        return result

    return run

def today():
    import datetime
    base = datetime.datetime.today()
    return str(base).split(" ")[0] + " 00:00:00"

def padded_range(x,y,padding=2):
    for i in range(0,99):
        yield str(i) if len(str(i)) == 2 else "0" + str(i)
    
        


class PatternSearchCache(object):
    """
    This handles all of the cacheing for the pattern-search for historically cached data
    """

    PREPPED = {}

    def prepare_query(self,query):

        prepped_executor = self.PREPPED.get(query,False)

        if prepped_executor:
            return prepped_executor

        statement = self.cassandra.prepare(query)

        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)

        self.PREPPED[query] = execute

        return execute


    def get_from_cache(self,query,advertiser,pattern,dates):
        execute = self.prepare_query(query)
        prepped = [[advertiser, pattern] + [date] for date in dates]

        data, _ = FutureHelpers.future_queue(prepped,execute,simple_append,60,[],None)

        return data

    def get_from_u2_cache(self,query,advertiser,pattern,dates):
        execute = self.prepare_query(query)
        prepped = [[advertiser, pattern] + [date,u2] for date in dates for u2 in range(0,100)]

        data, _ = FutureHelpers.future_queue(prepped,execute,simple_append,60,[],None)

        return data

    def get_from_cache_sorted(self,query,advertiser,pattern,dates,sortby="date"):
        # this should be named grouped...
        # it just performs a simple grouping bases on the sortby column and saves time later
        execute = self.prepare_query(query)
        prepped = [[advertiser, pattern] + [date] for date in dates]

        data, _ = FutureHelpers.future_queue(prepped,execute,sorted_append(sortby),60,{},None)

        return data

    @formattable
    @Query("SELECT * FROM rockerbox.pattern_occurrence_urls_counter ")
    def get_urls_from_cache(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_from_cache_sorted(query,advertiser, pattern,dates)
        return data

    @formattable
    @Query("SELECT domain, date, count FROM rockerbox.pattern_occurrence_domains_counter ")
    def get_domains_from_cache(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_from_cache_sorted(query,advertiser, pattern, dates)
        return data

    @formattable
    @Query("SELECT * FROM rockerbox.pattern_occurrence_users_u2 ")
    def get_uids_from_cache(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_from_cache(query,advertiser, pattern,dates)
        return data

    @formattable
    @Query("SELECT * FROM rockerbox.pattern_occurrence_u2_counter ")
    def get_u2(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_from_cache(query,advertiser, pattern,dates)
        return data

    @formattable
    @Query("SELECT date, count FROM rockerbox.pattern_occurrence_views_counter ")
    def get_views_from_cache(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_from_cache(query,advertiser, pattern,dates)
        return data


    @formattable
    @Query("SELECT date, count FROM rockerbox.pattern_occurrence_visits ")
    def get_visits_from_cache(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_from_cache(query,advertiser, pattern, [d for d in dates if d != today()])
        data += self.get_visits_today(advertiser,pattern)
        return data

    @formattable
    @QueryU2("SELECT date, count_simple(uid) FROM rockerbox.pattern_occurrence_u2_counter ")
    def get_visits_from_cache_new(self,advertiser,pattern,dates = [], **kwargs):

        # this should probably only be used for dates that are blank since it takes more time...

        query = kwargs.get("query")
        data = self.get_from_u2_cache(query, advertiser, pattern,dates)

        import pandas
        dtrans = [
            {"date":i['date'], "count":i['rockerbox.count_simple(uid)']['count'] } 
            for i in data if i['date']
        ]

        df = pandas.DataFrame(dtrans)
        df = df.groupby("date").sum()['count'].reset_index()
        assert(len(df.columns) == 2)

        count = df.T.to_dict().values()

        return count



    @formattable
    @Query("SELECT date, count FROM rockerbox.pattern_occurrence_uniques ")
    def get_uniques_from_cache(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_from_cache(query,advertiser, pattern, [d for d in dates if d != today()])
        data += self.get_uniques_today(advertiser,pattern)
        return data


    @formattable
    @QueryU2("SELECT date, count_simple(uid) FROM rockerbox.pattern_occurrence_users_u2 ")
    def get_uniques_from_cache_new(self,advertiser,pattern,dates = [], **kwargs):

        # this should probably only be used for dates that are blank...

        query = kwargs.get("query")
        data = self.get_from_u2_cache(query, advertiser, pattern,dates)

        import pandas
        dtrans = [
            {"date":i['date'], "count":i['rockerbox.count_simple(uid)']['count'] } 
            for i in data if i['date']
        ]

        df = pandas.DataFrame(dtrans)
        df = df.groupby("date").sum()['count'].reset_index()
        assert(len(df.columns) == 2)

        count = df.T.to_dict().values()

        return count




    @QueryU2("SELECT count_simple(uid) FROM rockerbox.pattern_occurrence_u2_counter ")
    def get_visits_today(self,advertiser,pattern, **kwargs):
        query = kwargs.get("query")
        dates = [today()]
        data = self.get_from_u2_cache(query, advertiser, pattern,dates)
        count = [{
            "count":reduce(lambda p,c: p + c['rockerbox.count_simple(uid)'].get("count",0), data, 0),
            "date": dates[0]
        }]
        return count

    @QueryU2("SELECT count_simple(uid) FROM rockerbox.pattern_occurrence_users_u2 ")
    def get_uniques_today(self,advertiser,pattern, **kwargs):
        query = kwargs.get("query")
        dates = [today()]
        data = self.get_from_u2_cache(query, advertiser, pattern,dates)
        count = [{
            "count":reduce(lambda p,c: p + c['rockerbox.count_simple(uid)'].get("count",0), data, 0),
            "date": dates[0]
        }]
        return count






class PatternSearchCacheWithConnector(PatternSearchCache):

    def __init__(self,cassandra):
        self.cassandra = cassandra

if __name__ == "__main__":
    from link import lnk
    connected = PatternSearchCacheWithConnector(lnk.dbs.cassandra)
    print connected.get_urls("baublebar","bracelet")[0]
    print connected.get_domains("baublebar","bracelet")[0]
    print connected.get_views("baublebar","bracelet")[0]
    print connected.get_visits("baublebar","bracelet")[0]
    print connected.get_uniques("baublebar","bracelet")[0]




