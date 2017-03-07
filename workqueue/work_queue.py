import Queue
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

CACHEQUERY ="select count(*) from generic_function_cache where advertiser='%(advertiser)s' and url_pattern='%(url_pattern)s' and action_id='%(action_id)s' and udf='%(udf)s'"
CLEARQUERY ="delete from generic_function_cache where advertiser=%(advertiser)s and url_pattern=%(url_pattern)s and action_id=%(action_id)s and udf=%(udf)s and date=%(date)s"
DATEQUERY = "select date from generic_function_cache where advertiser='%(advertiser)s' and url_pattern='%(url_pattern)s' and action_id='%(action_id)s' and udf='%(udf)s' order by date limit 1"
START_QUERY = "insert into work_queue_log (hostname, event) values (%s, %s)"
SELECTOLDCACHE = "select zipped from generic_function_cache where advertiser = %s and action_id = %s and udf = %s"


def clear_old_cache(**kwargs):
    query_args = {}
    query_args['advertiser'] = kwargs['advertiser']
    query_args['action_id'] = kwargs['filter_id']
    query_args['url_pattern'] = kwargs['pattern']
    query_args['udf'] = kwargs['func_name']
    count_of_cache = kwargs['connectors']['crushercache'].select_dataframe(CACHEQUERY % query_args)
    if count_of_cache['count(*)'][0] > 9:
        date = kwargs['connectors']['crushercache'].select_dataframe(DATEQUERY % query_args)['date'][0] 
        query_args['date'] = date.strftime('%Y-%m-%d')
        kwargs['connectors']['crushercache'].execute(CLEARQUERY, query_args)
        logging.info("removed old item in cache")

def get_crusher_obj(advertiser, base_url, crusher):
    crusher.user = "a_{}".format(advertiser)
    crusher.password= "admin"
    crusher.base_url = base_url
    crusher.authenticate()
    logging.info(crusher._token)
    return crusher

def validate_crusher(crusher, advertiser):
    valid = False
    _resp = crusher.get('/account/permissions')
    logged_in_as = _resp.json['results']['advertisers'][0]['pixel_source_name']
    if advertiser == logged_in_as:
        valid = True
    return valid

class WorkQueue(object):

    def __init__(self,exit_on_finish, zkwrapper,reactor,timer, mcounter, connectors):
        self.zk_wrapper = zkwrapper
        self.rec = reactor
        self.connectors = connectors
        self.timer = timer
        self.mcounter = mcounter
        self.current_host = socket.gethostname()
        self.connectors['crushercache'].execute(START_QUERY, (self.current_host, 'Box WQ up'))

    def remove_old_item(self, **kwargs):
        data = self.connectors['crushercache'].select_dataframe(SELECTOLDCACHE, (kwargs['advertiser'], kwargs['filter_id'], kwargs['func_name']))
        if len(data) > 0:
            clear_old_cache(**kwargs)

    def log_error(self, e, job_id):
        logging.info("data not inserted")
        box = socket.gethostname()
        self.mcounter.bumpError()
        trace_error = str(traceback.format_exc())
        self.connectors['crushercache'].execute(SQL_LOG, (self.current_host, job_id, "Fail"))
        self.connectors['crushercache'].execute(SQL_LOG2,(box, str(e), job_id, trace_error))
        logging.info("ERROR: queue %s " % e)
        logging.info(trace_error)

    def set_api_wrapper(self, kwargs):
        if self.connectors['crusher_wrapper'].user != "a_{}".format(kwargs['advertiser']):
            logging.info("crusher object not set to current user, setting now current user is %s % kwargs['advertiser']")
            self.connectors['crusher_wrapper'] = get_crusher_obj(kwargs['advertiser'],"http://beta.crusher.getrockerbox.com", self.connectors['crusher_wrapper'])
            valid = validate_crusher(self.connectors['crusher_wrapper'], kwargs['advertiser']) if self.connectors['crusher_wrapper']._token else False
        else:
            valid = True
        return valid
             

    def log_job_success(self, job_id, fn, kwargs):
        self.mcounter.bumpSuccess()
        self.connectors['crushercache'].execute(SQL_LOG, (self.current_host, job_id, "Ran"))
        self.timer.resetTime()
        logging.info("finished item in queue %s %s" % (str(fn),str(kwargs)))

    def log_before_job(self, job_id, entry_id, valid, fn, kwargs):
        self.zk_wrapper.sets(job_id, entry_id)
        logging.info("crusher object is valid: %s"  % valid)
        logging.info("starting queue %s %s" % (str(fn),str(kwargs)))

    def run_job(self, data, job_id, entry_id):
        fn, kwargs = pickle.loads(data)
        kwargs['job_id'] = job_id
        kwargs['connectors']=self.connectors
        valid = self.set_api_wrapper(kwargs)
        self.log_before_job(job_id, entry_id, valid, fn, kwargs)
        fn(**kwargs)
        self.log_job_success(job_id, fn, kwargs)
        if kwargs.get('filter_id',False):
            self.remove_old_item(**kwargs)

    def log_process(self, job_id):
        self.mcounter.bumpDequeue()
        self.connectors['crushercache'].execute(SQL_LOG, (self.current_host, job_id, "DeQueue"))
        logging.debug("Received next queue item")

    def process_job(self, entry_id, data):
        import hashlib
        import time
        job_id = hashlib.md5(data).hexdigest()
        logging.getLogger().handlers[0].job_id = job_id
        job_id = entry_id + "_" + job_id
        self.log_process(job_id)
        try:
            self.run_job(data, job_id, entry_id)
        except Exception as e:
            self.connectors['crusher_wrapper'].logout_user()
            time.sleep(1)
            self.log_error(e, job_id)
        finally:
            logging.info("finished item in queue")
            logging.getLogger().handlers[0].job_id = "000000"
            self.zk_wrapper.finish(job_id, entry_id)

    def run_queue(self):
        logging.info("Asking for next queue item")
        entry_id, data = self.zk_wrapper.get()
        self.rec.getThreadPool().threads[0].setName("WQ")
        if data is not None:
            self.process_job(entry_id, data)
        else:
            import time
            time.sleep(5)
            logging.info("RESET queue")
            self.zk_wrapper.reset_queue()

    def __call__(self):
        while True:
            self.run_queue()
            logging.info("finished run queue")
