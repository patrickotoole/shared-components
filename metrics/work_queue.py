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

client = KazooClient(hosts="zk1:2181")


def my_listener(state):
    if state == KazooState.LOST:
        print "CONNECTION LOST"
    elif state == KazooState.SUSPENDED:
        print "CONNECTION SUS"
    else:
        print "CONNECTING"
        # Handle being connected/reconnected to Zookeeper

client.add_listener(my_listener)

client.start()
work_queue = SingleQueue(client,"/python_queue") 



class WorkQueue(object):

    def __init__(self,queue,lock=None):
        self.queue = queue

    def __call__(self):
        while True:
            logging.info("Asking for next queue item")
            data = self.queue.get()
            if data is not None:
                logging.info("Received next queue item")
               
                fn, args = pickle.loads(data)

                logging.info("starting queue %s %s" % (str(fn),str(args)))
                fn(*args) 
                logging.info("finished queue %s %s" % (str(fn),str(args)))

            else:
                import time
                time.sleep(1)
                logging.info("No data in queue")
            logging.info("Moving on to next queue item")
