import Queue
import logging
from kazoo.client import KazooClient
from kazoo.client import KazooState
import kazoo
import pickle

class SingleQueue(kazoo.recipe.queue.Queue):

    _instance = None
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SingleQueue, cls).__new__(
                                cls, *args, **kwargs)
        return cls._instance



class WorkQueue(object):

    def __init__(self,client):
        self.client = client
        self.queue = SingleQueue(client,"/python_queue")

    def __call__(self):
        while True:
            logging.debug("Asking for next queue item")
            data = self.queue.get()
            if data is not None:
                logging.debug("Received next queue item")
               
                fn, args = pickle.loads(data)

                logging.info("starting queue %s %s" % (str(fn),str(args)))
                try:
                    fn(self.client,*args) 
                    logging.info("finished queue %s %s" % (str(fn),str(args)))
                except Exception as e:
                    logging.info("ERROR: queue %s %s" % (str(fn),str(args)))
 

            else:
                import time
                time.sleep(1)
                logging.debug("No data in queue")
            logging.debug("Moving on to next queue item")
