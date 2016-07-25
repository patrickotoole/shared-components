import Queue
from lib.zookeeper import CustomQueue
import traceback
import logging
from kazoo.client import KazooClient
from kazoo.client import KazooState
import kazoo
import pickle
import socket
import datetime

SQL_LOG = "insert into work_queue_log (hostname, job_id, event) values (%s, %s, %s)"
SQL_LOG2 = "insert into work_queue_error_log (hostname, error_string, job_id, stacktrace) values (%s, %s, %s, %s)"

def get_crusher_obj(advertiser, base_url):
    from link import lnk
    crusher = lnk.api.crusher
    crusher.user = "a_{}".format(advertiser)
    crusher.password= "admin"
    crusher.base_url = base_url
    crusher.authenticate()
    logging.info(crusher._token)
    return crusher

class WorkQueue(object):

    def __init__(self,exit_on_finish, client,reactor,timer, mcounter, zk_path, connectors):
        self.client = client
        volume = datetime.datetime.now().strftime('%m%y')
        self.queue = CustomQueue.CustomQueue(client,zk_path, "log", "v" + volume)
        self.rec = reactor
        self.connectors = connectors
        self.timer = timer
        self.mcounter = mcounter
        START_QUERY = "insert into work_queue_log (hostname, event) values (%s, %s)"
        self.sock_id = socket.gethostname()
        self.connectors['crushercache'].execute(START_QUERY, (self.sock_id, 'Box WQ up'))
        self.crusher_wrapper = get_crusher_obj("rockerbox","http://beta.crusher.getrockerbox.com")

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
                    if self.crusher_wrapper.user != "a_{}".format(kwargs['advertiser']):
                        self.crusher_wrapper = get_crusher_obj(kwargs['advertiser'],"http://beta.crusher.getrockerbox.com")
                    
                    logging.info("starting queue %s %s" % (str(fn),str(kwargs)))
                    logging.info(self.rec.getThreadPool().threads[0])
                    logging.info(self.rec.getThreadPool().threads[0].is_alive())
                    logging.info(self.rec.getThreadPool().threads[0].ident)
                    kwargs['connectors']=self.connectors
                    kwargs['connectors']['crusher_wrapper'] = self.crusher_wrapper
                    fn(**kwargs) 
                    
                    self.mcounter.bumpSuccess()
                    self.connectors['crushercache'].execute(SQL_LOG, (current_host, job_id, "Ran"))

                    self.timer.resetTime()
                    logging.info("finished item in queue %s %s" % (str(fn),str(kwargs)))
                except Exception as e:
                    logging.info("data not inserted")
                    box = socket.gethostname()
                    self.mcounter.bumpError()
                    trace_error = str(traceback.format_exc())
                    self.connectors['crushercache'].execute(SQL_LOG, (current_host, job_id, "Fail"))
                    self.connectors['crushercache'].execute(SQL_LOG2,(box, str(e), job_id, trace_error))
                    logging.info("ERROR: queue %s " % e)
                    logging.info(trace_error)
                    import time
                    time.sleep(5)
                finally:
                    self.queue.client.ensure_path(self.queue.secondary_path_base + "/%s/%s" % (job_id.split(entry_id)[1][1:],  entry_id))
                    self.queue.client.set(self.queue.secondary_path_base + "/%s/%s" % (job_id.split(entry_id)[1][1:], entry_id), '' ) # running
 
            else:
                import time
                time.sleep(1)
                logging.debug("No data in queue")
