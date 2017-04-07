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

QUERY = "insert into cache_finish (job_id, finish_type) values ('%s', 'removed')"

class RemoveHandler(tornado.web.RequestHandler, RPCQueue):

    def initialize(self, zookeeper=None, *args, **kwargs):
        self.crushercache = kwargs.get("crushercache", None)
        self.zk_wrapper = kwargs.get("zk_wrapper",None)

    def finish_log(self, job_id):
        self.crushercache.execute(QUERY % job_id)

    def clear_item(self, job_id):
        import hashlib
        path = self.zk_wrapper.zk_path
        job_ids = self.zk_wrapper.zk.get_children(path)
        job_exists = False
        for job in job_ids:
            data = self.zk_wrapper.zk.get(path+"/"+job)
            if hashlib.md5(data[0]).hexdigest():
                self.zk_wrapper.zk.delete(path+"/"+job)
                job_exists = hashlib.md5(data[0]).hexdigest()
                self.finish_log(job_exists)
        if job_exists:
            self.write(json.dumps({"Status":"Success"}))
        else:
            self.write(json.dumps({"Status":"Error", "Reason":"job not found"}))
        self.finish()

    @tornado.web.asynchronous
    def get(self):
        job_id = self.get_argument("job_id",False)
        
        self.clear_item(job_id)
