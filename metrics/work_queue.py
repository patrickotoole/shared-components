import Queue
from lib.zookeeper import CustomQueue
import logging
from kazoo.client import KazooClient
from kazoo.client import KazooState
import kazoo
import pickle
import socket
import datetime

SQL_LOG = "insert into work_queue_log (hostname, job_id, event) values (%s, %s, %s)"
SQL_LOG2 = "insert into work_queue_error_log (hostname, error_string, job_id) values (%s, %s, %s)"

class WorkQueue(object):

    def __init__(self,exit_on_finish, client,reactor,timer, mcounter, connectors):
        self.client = client
        volume = datetime.datetime.now().strftime('%m%y')
        self.queue = CustomQueue.CustomQueue(client,"/python_queue", "log", "v" + volume)
        self.rec = reactor
        self.connectors = connectors
        self.timer = timer
        self.mcounter = mcounter
        START_QUERY = "insert into work_queue_log (hostname, event) values (%s, %s)"
        self.sock_id = socket.gethostname()
        self.connectors['crushercache'].execute(START_QUERY, (self.sock_id, 'Box WQ up'))

    def __call__(self):
        import hashlib
        import socket
        while True:
            logging.debug("Asking for next queue item")
            entry_id, data = self.queue.get_w_name()
            self.rec.getThreadPool().threads[0].setName("WQ")
            if data is not None:
                job_id = hashlib.md5(data).hexdigest()
                job_id = entry_id + "_" + job_id
                current_host = socket.gethostname()
                self.mcounter.bumpDequeue()
                self.connectors['crushercache'].execute(SQL_LOG, (current_host, job_id, "DeQueue"))
                logging.debug("Received next queue item")
                try:
                    fn, kwargs = pickle.loads(data)

                    self.queue.client.set(self.queue.secondary_path_base + "/%s/%s" % (job_id.split(entry_id)[1][1:], entry_id), '1' ) # running
                    kwargs['job_id'] = job_id
                    logging.info("starting queue %s %s" % (str(fn),str(kwargs)))
                    logging.info(self.rec.getThreadPool().threads[0])
                    logging.info(self.rec.getThreadPool().threads[0].is_alive())
                    logging.info(self.rec.getThreadPool().threads[0].ident)
                    kwargs['connectors']=self.connectors
                    fn(**kwargs) 
                    
                    self.mcounter.bumpSuccess()
                    self.connectors['crushercache'].execute(SQL_LOG, (current_host, job_id, "Ran"))

                    self.timer.resetTime()
                    logging.info("finished queue %s %s" % (str(fn),str(kwargs)))
                except Exception as e:
                    box = socket.gethostname()
                    self.mcounter.bumpError()
                    self.connectors['crushercache'].execute(SQL_LOG, (current_host, job_id, "Fail"))
                    self.connectors['crushercache'].execute(SQL_LOG2,(box, str(e), job_id))
                    logging.info("ERROR: queue %s " % e)
                finally:
                    self.queue.client.set(self.queue.secondary_path_base + "/%s/%s" % (job_id, entry_id), '' ) # finished
 
            else:
                import time
                time.sleep(10)
                logging.debug("No data in queue")
