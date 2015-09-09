import logging


class FutureHelpers:

    @staticmethod
    def max_steps_event(max_steps):
        """
        This is used to keep track of futures which have returned with a result.
        After each stepm the number of finished events is incremented until
        all have been called.
        """
        from itertools import count
        from threading import Event
    
        finished_event = Event()
        num_finished = count()
    
        def step():
            finished = num_finished.next()
            logging.debug("Steps finished / steps total: %s/%s" % (finished, max_steps))
            if finished == (max_steps-1):
                finished_event.set()
    
        return (finished_event,step)
    
    @staticmethod
    def run_next(result,iterable,run_future,always,success,*args):
        """ 
        This is used to run the next future.
        """
        def cb_with_result(result):
            FutureHelpers.run_next(result,iterable,run_future,always,success,*args)
            always()
            return 
    
        if type(result) is list:
            success(result,*args)
        else:
            pass
    
        try:
            query = iterable.next()
            future = run_future(query)
            logging.info(future._current_host.address)
            future.add_callbacks(cb_with_result,cb_with_result)
        except Exception as e:
            #logging.error(e)
            pass


    @staticmethod
    def future_queue(data,bound,callback,queue_size=300,*args):
        """
        This will modify the args within the callback function and then return them
        after all the futures have responded.
        """
        length = len(data)
        iterable = iter(data)
        event, step = FutureHelpers.max_steps_event(length)

        for i in range(min(queue_size,length)):
            FutureHelpers.run_next(False,iterable,bound,step,callback,*args)
        event.wait()

        return args
        
class CassandraStatement(object):

    def __init__(self,session=None):
        self.cassandra = session

    def build_statement(self,query,what,where):
        params = { "what": what, "where": where }
        statement = self.cassandra.prepare(query % params)
        return statement

    def build_bound_data(self,fixed,dates,start,end):
        prefixes = range(start,end)

        return [fixed + [date,i] for i in prefixes for date in dates]

    def bind_and_execute(self,statement):

        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)

        return execute

class CassandraBase(object):
    
    def run_many(self,bound_statement,data,callback,results,*args):
        future_responses = FutureHelpers.future_queue(data,bound_statement,callback,results,*args)
        return future_responses

    def sampled(self):
        pass

    def cached(self):
        pass

    def full(self):
        pass

class CassandraRangeQuery(object):

    SAMPLE_SIZES = [(0,1),(1,5),(5,50),(50,100)]

    def __init__(self,cassandra,query,fields,range_field):
        self.query = query
        self.fields = fields
        self.range_field = range_field

    def __where__(self):
        where = " WHERE " 
        where += " and ".join(["%s = ?" % f for f in fields])
        where += " and %s = ?" % range_field
        return where

    @property
    def statement(self):
        if not hasattr(self,"__statement__"):
            self.__statement__ = self.cassandra.prepare(self.query + self.__where__)
        return self.__statement__

    def execute(data):
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

    
