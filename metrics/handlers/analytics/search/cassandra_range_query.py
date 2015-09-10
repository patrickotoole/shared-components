from cassandra_statement import CassandraStatement

class CassandraRangeQuery(CassandraStatement):
    
    SAMPLE_SIZES = [(0,1),(1,5),(5,50),(50,100)]
    
    def __init__(self,cassandra,query,fields,range_field):
        self.query = query
        self.fields = fields
        self.range_field = range_field
    
    def __where__(self):
        where = " WHERE "
        where += " and ".join(["%s = ?" % f for f in self.fields])
        where += " and %s = ?" % self.range_field
        return where
    
    @property
    def statement(self):
        if not hasattr(self,"__statement__"):
            self.__statement__ = self.cassandra.prepare(self.query + self.__where__())
        return self.__statement__
    
    def execute(self,data):
        bound = self.statement.bind(data)
        return self.cassandra.execute_async(bound)
    
    def run_range(self,data,start,end,callback,*args):
        data_prime = [d + [i] for d in data for i in range(start,end)]
        response = FutureHelpers.future_queue(data_prime,self.execute,callback,150,*args)
        return response
    
    def run_sample(self,data,callback,is_sufficient,*args):
        for sample in self.SAMPLE_SIZES:
            response = self.run_range(data,sample[0],sample[1],callback,*args)
            if is_sufficient(response): break
        return (response, sample[1])
