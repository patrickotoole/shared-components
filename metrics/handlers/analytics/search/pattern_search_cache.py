from lib.cassandra_cache.helpers import *
from lib.cassandra_helpers.helpers import FutureHelpers

def Query(query):

    def wrapped(fn):

        INDEX = "source = ? and action = ? and date = ? "
        def run(*args,**kwargs):
            kwargs['query'] = query + " WHERE " + INDEX
            return fn(*args,**kwargs)

        return run

    return wrapped


class PatternSearchCache(object):
    """
    This handles all of the cacheing for the pattern-search for historically cached data
    """

    def prepare(self,query):

        statement = self.cassandra.prepare(query)

        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)

        return execute


    def get_generic(self,query,advertiser,pattern,dates):
        execute = self.prepare(query)
        prepped = [[advertiser, pattern] + [date] for date in dates]

        data, _ = FutureHelpers.future_queue(prepped,execute,simple_append,60,[],None)

        return data

    @Query("SELECT * FROM rockerbox.pattern_occurrence_urls_counter ")
    def get_urls(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_generic(query,advertiser, pattern,dates)
        return data

    @Query("SELECT * FROM rockerbox.pattern_occurrence_domains_counter ")
    def get_domains(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_generic(query,advertiser, pattern,dates)
        return data

    @Query("SELECT * FROM rockerbox.pattern_occurrence_users_counter ")
    def get_users(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_generic(query,advertiser, pattern,dates)
        return data

    @Query("SELECT * FROM rockerbox.pattern_occurrence_u2_counter ")
    def get_u2(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_generic(query,advertiser, pattern,dates)
        return data

    @Query("SELECT * FROM rockerbox.pattern_occurrence_views_counter ")
    def get_views(self,advertiser,pattern,dates = [], **kwargs):

        data = self.get_generic(query,advertiser, pattern,dates)
        return data

    @Query("SELECT * FROM rockerbox.pattern_occurrence_visits ")
    def get_visits(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_generic(query,advertiser, pattern,dates)
        return data


    @Query("SELECT * FROM rockerbox.pattern_occurrence_uniques ")
    def get_uniques(self,advertiser,pattern,dates = [], **kwargs):
        query = kwargs.get("query")
        data = self.get_generic(query,advertiser, pattern,dates)
        return data






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




