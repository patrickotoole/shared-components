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


class StatusHandler(tornado.web.RequestHandler, RPCQueue):

    def initialize(self, zookeeper=None, *args, **kwargs):
        self.crushercache = kwargs.get("crushercache",None)
        self.zk_wrapper = kwargs.get("zk_wrapper",None)
        self.db = kwargs.get("db", None)

    def get_id(self, job_id):
        try:
            submitted = self.crushercache.select_dataframe("select a.updated_at as submitted_at, b.updated_at as added_at, c.updated_at as started_at, a.job_id from cache_submit a left join cache_add b on a.job_id = b.job_id left join cache_started c on a.job_id=c.job_id where a.job_id='%s'" %  _job_id)
            self.write(ujson.dumps(data.to_dict('records')))
            self.finish()
        except Exception as e:
            self.set_status(400)
            self.write(ujson.dumps({"Error":str(e)}))
            self.finish()

    def get_num(self):
        path_queue = [c for c in self.zk_wrapper.zk.get_children("/python_queue")]
        self.counter=0
        def parse(x):
            self.counter = self.counter+1

        in_queue= [parse(path) for path in path_queue]

        self.write(ujson.dumps({"number":self.counter}))
        self.finish()


    @tornado.web.asynchronous
    def get(self):
        job_id = self.get_arguments("job_id",False)
        if not job_id:
            self.get_num()
        else:
            self.get_id(job_id)
