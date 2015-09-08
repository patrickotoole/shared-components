import logging
QUERY  = """SELECT %(what)s FROM rockerbox.visit_uids_lucene_timestamp_u2_clustered %(where)s"""

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
            success(result[0],*args)
        else:
            pass
    
        try:
            query = iterable.next()
            future = run_future(query)
            logging.debug(future._current_host.address)
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
        
        

            
def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates


class CassandraBoundStatement(object):

    def __init__(self,session=None,query=QUERY):
        self.cassandra = session
        self.query = query

    def build_bound_statement(self):
        what = "date, group_and_count(url,uid)"
        where = "WHERE source = ? and date = ? and u2 = ?"
        params = { "what": what, "where": where }
        statement = self.cassandra.prepare(self.query % params)
        return statement

    def build_bound_data(self,advertiser,dates,start,end):
        prefixes = range(start,end)

        return [[advertiser,date,i] for i in prefixes for date in dates]

    def bind_and_execute(self,statement):

        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)

        return execute

