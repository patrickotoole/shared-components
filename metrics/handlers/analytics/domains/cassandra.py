from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *

CACHED = "select * from rockerbox.pattern_occurrence_domains_counter where source = ? and action = ? and date = ?"

class VisitDomainCassandra(object):

    PARALLELISM = 120

    def get_domains_use_futures(self, uids, date_clause):
        
        statement = self.cassandra.prepare(self.DOMAIN_SELECT)
        prepped_data = [[u] for u in uids]
        results_buffer = []

        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)
 
        queue_args = [prepped_data,execute,simple_append,self.PARALLELISM,results_buffer,"DUMMY_VAR"]
        results, _ = FutureHelpers.future_queue(*queue_args)

        return results

    def cache_select(self, source, pattern, date_clause):

        DOMAIN_SELECT = CACHED
        statement = self.cassandra.prepare(DOMAIN_SELECT)
        dates = build_datelist(14) 
        prepped = [[source,pattern,date] for date in dates]

        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)
       
        results = FutureHelpers.future_queue(prepped,execute,simple_append,60,[])
        results = results[0]

        return results


