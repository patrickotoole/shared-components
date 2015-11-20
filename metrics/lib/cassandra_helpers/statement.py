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
