import Queue
import logging
from kazoo.client import KazooClient
from kazoo.client import KazooState
import kazoo
import pickle
import socket

class SingleQueue(kazoo.recipe.queue.Queue):

    _instance = None
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SingleQueue, cls).__new__(
                                cls, *args, **kwargs)
        return cls._instance

SQL_LOG = "insert into work_queue_log (box, job_id, event) values ('{}', '{}', '{}')"

class WorkQueue(object):

    def __init__(self,exit_on_finish, client,connectors):
        self.client = client
        self.queue = SingleQueue(client,"/python_queue")
        self.connectors = connectors
        #log start
        START_QUERY = "insert into work_queue_log (box, event) values ('{}', 'Box WQ up')"
        self.connectors['crushercache'].execute(START_QUERY.format(socket.gethostname()))
        self.exit_on_finish = exit_on_finish

    def __call__(self):
        import hashlib
        import socket
        while True:
            logging.debug("Asking for next queue item")
            data = self.queue.get()

            if data is not None:
                job_id = hashlib.md5(data).hexdigest()
                current_host = socket.gethostname()
                self.connectors['crushercache'].execute(SQL_LOG.format(current_host, job_id, "DeQueue"))
                logging.debug("Received next queue item")
                try:
                    fn, args = pickle.loads(data)
                    args.append(job_id)
                    args.append(self.connectors)

                    logging.info("starting queue %s %s" % (str(fn),str(args)))
                    fn(*args) 
                    
                    self.connectors['crushercache'].execute(SQL_LOG.format(current_host, job_id, "Ran"))
                    logging.info("finished queue %s %s" % (str(fn),str(args)))
                except Exception as e:
                    self.connectors['crushercache'].execute(SQL_LOG.format(current_host, job_id, "Fail"))
                    self.connectors['crushercache'].execute(SQL_LOG2.format(box, job_idstr(e)))
                    logging.info("ERROR: queue %s " % e)
 
            else:
                if self.exit_on_finish:
                    logging.debug("No data in queue")
                    self.connectors['sys_exit']()
                else:
                    import time
                    time.sleep(5)
                    logging.debug("No data in queue")
            logging.debug("Moving on to next queue item")

    def __exit__(self):
        END_QUERY = "insert into work_queue_log (box, event) values ('{}', 'Box WQ down')"
        self.connectors['crushercache'].execute(END_QUERY.format(socket.gethostname()))
        #log exit
