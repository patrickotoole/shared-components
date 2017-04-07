import tornado.web
import json
import pandas
import StringIO
import pickle

import work_queue
from kazoo.exceptions import NoNodeError
from RPCQueue import RPCQueue
from twisted.internet import defer
from lib.helpers import *

BATCH_BASE = "insert into cache_finish (job_id, finish_type) values "

class ClearHandler(tornado.web.RequestHandler, RPCQueue):

    def initialize(self, zookeeper=None, *args, **kwargs):
        self.crushercache = kwargs.get("crushercache", None)
        self.zk_wrapper = kwargs.get("zk_wrapper",None)

    def finish_log(self, job_ids):
        BATCH_QUERY = BATCH_BASE + ",".join(["('%s', 'removed')" for x in range(0,50)])
        batches = len(job_ids) / 50
        extra_batch = len(job_ids) % 50
        start = 0; end =0
        for x in range(0,batches):
            start = 0; end =50
            self.crushercache.execute(BATCH_QUERY % tuple(job_ids[start:end]))
            start +=50
            end += 50
        FINAL_BATCH = BATCH_BASE + ",".join(["('%s', 'removed')" for x in range(0,extra_batch)])
        self.crushercache.execute(FINAL_BATCH % tuple(job_ids[end:end+extra_batch]))

    def clear_queue(self, debug):
        path = "/python_queue_debug" if debug else self.zk_wrapper.zk_path
        job_ids = self.zk_wrapper.zk.get_children(path)
        if job_ids:
            self.finish_log(job_ids)
        self.zk_wrapper.zk.delete(path,recursive=True)
        self.zk_wrapper.zk.ensure_path(path)
        self.redirect("/")

    @tornado.web.asynchronous
    def get(self):
        debug = self.get_argument("debug",False)
        
        debug = True if debug else False
        self.clear_queue(debug)
