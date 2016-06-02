import tornado.web
import ujson
import pandas
import StringIO
import logging
import metrics.work_queue
import logging
import pickle
import hashlib

from twisted.internet import defer
from lib.helpers import * 

def parse(x, zk):
    try:
        values = pickle.loads(zk.get("/python_queue/" + x)[0])
        job_id = hashlib.md5(zk.get("/python_queue/" + x)[0]).hexdigest()
        #logging.info(values)
        rvals = values[1]
        rvals.append(job_id)
        return rvals
    except:
        logging.info("Error parsing pickle job")
        return False

class WorkQueueStatsHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, *args, **kwargs):
        self.zookeeper = zookeeper

    def get_summary(self):
        import datetime
        path_queue = [c for c in self.zookeeper.get_children("/python_queue") ]
        
        in_queue = [parse(path, self.zookeeper) for path in path_queue]
        df = pandas.DataFrame(in_queue)
        
        in_queue = [i for i in in_queue if i]
        
        if len(df)> 0:
            adv_df = df.groupby([0]).count()
            adv_df = adv_df.filter([2])
            adv_df.columns = ['count']
            adv_df = adv_df.reset_index()

            df['script_type'] = df[4].apply(lambda x : x.split('|')[1])
            df['date'] = df[4].apply(lambda x : x.split('|')[0])

            script_df = df.groupby(['script_type']).count()
            script_df = script_df.filter([0])
            script_df.columns = ['count']
            script_df = script_df.reset_index()

            minute_df = df.groupby(['date']).count()
            minute_df = minute_df.filter([0])
            minute_df.columns = ['count']
            minute_df = minute_df.reset_index()

            #organize data into tree structure and write that
            obj_to_write = {"summary":{"time": minute_df.to_dict('records'), "advertiser":adv_df.to_dict('records'),"scripts": script_df.to_dict('records')}, "jobs": df.to_dict('records')}

            self.write(ujson.dumps(obj_to_write, sort_keys=True))
            self.finish()
        else:
            self.write(ujson.dumps({"number_in_queue": 0}))
            self.finish()

    def get_id(self, job_id):
        
        path_queue = [c for c in self.zookeeper.get_children("/python_queue") ]
        in_queue = [parse(path, self.zookeeper) for path in path_queue]
        requested_job = []
        import ipdb; ipdb.set_trace()
        for job in in_queue:
            if job:
                if(job[len(job)-1] == job_id):
                     requested_job = job
        import ipdb; ipdb.set_trace()

        self.write(ujson.dumps({}))
        self.finish()

    def get_num(self):
        path_queue = [c for c in self.zookeeper.get_children("/python_queue")]
        self.counter=0
        def parse(x):
            self.counter = self.counter+1
        
        in_queue= [parse(path) for path in path_queue]
        
        self.write(ujson.dumps({"number":self.counter}))
        self.finish()


    def get_data(self):
        path_queue = [c for c in self.zookeeper.get_children("/python_queue") ]

        in_queue = [parse(path, self.zookeeper) for path in path_queue]
        in_queue = [i for i in in_queue if i]

        if len(in_queue) > 0:
            df = pandas.DataFrame(in_queue)
        else:
            df = pandas.DataFrame({"items":[]})
        self.write(ujson.dumps(df.to_dict('recrods')))
        self.finish()

    @tornado.web.asynchronous
    def get(self, action=""):
        print action
        if action=="":
            self.get_data()
        elif "summary" in action:
            self.get_summary()
        elif "num" in action:
            self.get_num()
        else:
            self.get_id(action)
