import Queue
import logging
from kazoo.client import KazooClient
import kazoo
import pickle

class SingleQueue(kazoo.recipe.queue.Queue):

    _instance = None
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SingleQueue, cls).__new__(
                                cls, *args, **kwargs)
        return cls._instance

client = KazooClient(hosts="zk1:2181")
client.start()
work_queue = SingleQueue(client,"/python_queue") 

class WorkQueue(object):

    def __init__(self,queue,lock):
        self.queue = queue
        self.lock = lock

    def __call__(self):
        while True:
            self.lock.acquire()
            data = self.queue.get()
            self.lock.release()
            if data is not None:
               
                fn, args = pickle.loads(data)

                logging.info("starting queue %s %s" % (str(fn),str(args)))
                fn(*args) 
                logging.info("finished queue %s %s" % (str(fn),str(args)))


