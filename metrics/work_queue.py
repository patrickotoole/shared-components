import Queue
import logging

class SingleQueue(Queue.Queue):

    _instance = None
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SingleQueue, cls).__new__(
                                cls, *args, **kwargs)
        return cls._instance

work_queue = SingleQueue() 

class WorkQueue(object):

    def __init__(self,queue,lock):
        self.queue = queue
        self.lock = lock

    def __call__(self):
        while True:
            self.lock.acquire()
            fn, args = self.queue.get()
            self.lock.release()
            logging.info("starting queue %s %s" % (str(fn),str(args)))
            fn(*args) 
            logging.info("finished queue %s %s" % (str(fn),str(args)))


