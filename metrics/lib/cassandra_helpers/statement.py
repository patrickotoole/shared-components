class CassandraStatement(object):

    def __init__(self,cassandra=None):
        self.cassandra = cassandra 

    def prepare(self,query):
        return self.cassandra.prepare(query)

    def build_statement(self,query,what,where):
        params = { "what": what, "where": where }
        statement = self.cassandra.prepare(query % params)
        return statement

    def data_plus_values(self,data,values):
        return [i + [j] for i in data for j in values]
    

    def build_bound_data(self,fixed,dates,start,end):
        # DEPRECATED: 
        prefixes = range(start,end)

        return [fixed + [date,i] for i in prefixes for date in dates]

    def bind_and_execute(self,statement):

        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)

        return execute

class CassandraFutureStatement(CassandraStatement):

    def __init__(self,cassandra, query):
        self.cassandra = cassandra
        self.query = query

    def run_prepared_data(self,bound,data,result_function):
        from helpers import FutureHelpers
        values, _ = FutureHelpers.future_queue(data,bound,result_function,60,[],False)
        return values

    def run(self,data):
        statement = self.prepare(self.query)
        bound = self.bind_and_execute(statement)

        values = self.run_prepared_data(bound,data,simple_append)
        return values
        
    


