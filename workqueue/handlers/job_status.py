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
            submitted = self.crushercache.select_dataframe("select a.updated_at as submitted_at, b.updated_at as added_at, c.updated_at as started_at, d.finish_type, d.updated_at as finished_at, a.job_id from cache_submit a left join cache_add b on a.job_id = b.job_id left join cache_start c on a.job_id=c.job_id left join cache_finish d on a.job_id = d.job_id where a.job_id='%s' order by submitted_at desc limit 1" %  job_id)
            data = submitted.to_dict('records')
            processed_data = [{'submitted':str(x['submitted_at']), "added":str(x['added_at']), "started":str(x['started_at']), "finished":str(x["finished_at"]), "finish status":x["finish_type"], "job_id":x["job_id"]} for x in data]
            self.write(ujson.dumps(processed_data))
            self.finish()
        except Exception as e:
            self.set_status(400)
            self.write(ujson.dumps({"Error":str(e)}))
            self.finish()

    def get_advertiser(self, advertiser):
        try:
            submitted = self.crushercache.select_dataframe("select a.updated_at as submitted_at, b.updated_at as added_at, c.updated_at as started_at, d.finish_type, d.updated_at as finished_at, a.job_id from cache_submit a left join cache_add b on a.job_id = b.job_id left join cache_start c on a.job_id=c.job_id left join cache_finish d on a.job_id = d.job_id where b.params like '%{}%' order by submitted_at".format(advertiser))
            data = submitted.to_dict('records')
            processed_data = [{'submitted':str(x['submitted_at']), "added":str(x['added_at']), "started":str(x['started_at']), "finished":str(x["finished_at"]), "finish status":x["finish_type"], "job_id":x["job_id"]} for x in data]
            self.write(ujson.dumps(processed_data))
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
        job_id = self.get_argument("job_id",False)
        advertiser = self.get_argument("advertiser",False)
        if not job_id and not advertiser:
            self.get_num()
        if job_id and advertiser:
            self.write(json.dumps({"Status":"Error","Reason":"does not accept job id and advertser"}))
        if job_id:
            self.get_id(job_id)
        if advertiser:
            self.get_advertiser(advertiser)
