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
        if type(result) is list:
            success(result,*args)
        else:
            pass
    
        try:
            query = iterable.next()
            future = run_future(query)
            #logging.info(future._current_host.address)
            import time
            start_time = time.time()
            def cb_with_result(result):
                FutureHelpers.run_next(result,iterable,run_future,always,success,*args)
                always()
                #logging.info("%s %s" % (future._current_host.address,start_time-time.time()))
                return 
    

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
        

