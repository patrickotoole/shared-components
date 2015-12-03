from statement import CassandraStatement

def simple_append(result,results,*args):
    results += result

class CassandraFutureStatement(CassandraStatement):

    def __init__(self,cassandra, query):
        self.cassandra = cassandra
        self.query = query

    def run_prepared_data(self,bound,data,result_function,*args):
        from helpers import FutureHelpers
        values = FutureHelpers.future_queue(data,bound,result_function,60,*args)
        return values

    def run(self,data,fn,*args):
        # takes in:
        # - an array of data for queries 
        # - a function that you want to use to process it
        # - the arguments needed for the function

        statement = self.prepare(self.query)
        bound = self.bind_and_execute(statement)

        values = self.run_prepared_data(bound,data,fn,*args)
        return values
 
