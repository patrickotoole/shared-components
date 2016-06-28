import tornado.web
import ujson
import pandas
import StringIO
import logging
import metrics.work_queue
import logging
import pickle
import hashlib
import datetime
from RPCQueue import RPCQueue

from lib.zookeeper import CustomQueue
from twisted.internet import defer
from lib.helpers import * 

def parse(x, zk):
    try:
        time = zk.get("/python_queue/" + x)[1][2]
        values = pickle.loads(zk.get("/python_queue/" + x)[0])
        job_id = hashlib.md5(zk.get("/python_queue/" + x)[0]).hexdigest()
        logging.info(values)
        rvals = values[1]
        rvals['job_id']=job_id
        rvals['time'] = time
        return rvals
    except:
        logging.info("Error parsing pickle job")

def parse_for_id(x, zk):
    try:
        time = zk.get("/python_queue/" + x)[1][2]
        values = pickle.loads(zk.get("/python_queue/" + x)[0])
        job_id = hashlib.md5(zk.get("/python_queue/" + x)[0]).hexdigest()
        logging.info(values)
        rvals = values[1]
        rvals['job_id']=job_id
        return {"parameters":rvals, "time":time}
    except:
        logging.info("Error parsing pickle job")
        return False


class WorkQueueStatsHandler(tornado.web.RequestHandler, RPCQueue):

    def initialize(self, zookeeper=None, *args, **kwargs):
        self.zookeeper = zookeeper
        self.job = 0

    def get_id(self, _job_id, entry_id=False):
        try:
            date = datetime.datetime.now().strftime("%m%y")
            volume = "v{}".format(date)
            needed_path = secondary_path = '{path}-{secondary_path}/{volume}/{job_id}'.format(
            path="python_queue", secondary_path="log", volume=volume, job_id=_job_id)
            
            entry_ids = self.zookeeper.get_children(needed_path)
            df_entry={}
            df_entry['job_id']= _job_id
            if entry_id:
                df_entry['entry_id'] = str(entry_id).split("/")[2]
            df_entry['entries'] = []
            for entry in entry_ids:
                d1= parse_for_id(entry, self.zookeeper)
                if d1:
                    sub_obj = {}
                    values = d1['parameters']
                    sub_obj = values
                    sub_obj['entry']= entry
                    timestamp = d1['time']
                    sub_obj['time'] = timestamp
                    df_entry['entries'].append(sub_obj)
            self.write(ujson.dumps(df_entry))
            self.finish()
        except Exception as e:
            self.set_status(400)
            self.write(ujson.dumps({"Error":str(e)}))
            self.finish()

    def get_num(self):
        path_queue = [c for c in self.zookeeper.get_children("/python_queue")]
        self.counter=0
        def parse(x):
            self.counter = self.counter+1
        
        in_queue= [parse(path) for path in path_queue]
        
        self.write(ujson.dumps({"number":self.counter}))
        self.finish()


    def set_priority(self, job_id, priority_value, _version):
        try:
            cq = CustomQueue.CustomQueue(self.zookeeper,"python_queue", "log", _version)
             
            needed_path = str(cq.get_secondary_path()) + "/{}".format(job_id)
            entry_ids = self.zookeeper.get_children(needed_path)
            values = self.zookeeper.get("/python_queue/" + entry_ids[0])[0]
            
            priority_value = int(priority_value)
            entry_id = cq.put(values,priority_value)
            cq.delete(entry_ids)
            self.write(ujson.dumps({"result":"Success", "entry_id":entry_id}))
            self.finish()
        except Exception as e:
            self.set_status(400)
            self.write(ujson.dumps({"Error":str(e)}))
            self.finish()

    def get_data(self):
        path_queue = [c for c in self.zookeeper.get_children("/python_queue") ]

        in_queue = [parse(path, self.zookeeper) for path in path_queue]
        in_queue = [i for i in in_queue if i]

        if len(in_queue) > 0:
            df = pandas.DataFrame(in_queue)
        else:
            df = pandas.DataFrame({"items":[]})
        df = df.fillna("N/A")
        self.write(ujson.dumps(df.to_dict('records')))
        self.finish()

    @tornado.web.asynchronous
    def get(self, action=""):
        print action
        if action=="":
            self.get_data()
        elif "num" in action:
            self.get_num()
        else: 
            self.get_id(action)

    @tornado.web.asynchronous
    def post(self, action=""):
        priority_value = self.get_argument("priority", 2)
        _version = self.get_argument("version", "v{}".format(datetime.datetime.now().strftime("%m%y")))
        print action
        if 'priority' in action:
            job_id = str(action).split("/")[1]
            if priority_value:
                self.set_priority(job_id, priority_value, _version)
            else:
                self.get_id(action)
        else:
            try:
                entry, job_id = self.add_to_work_queue(self.request.body)
                self.get_id(job_id, entry)
            except Exception, e:
                self.set_status(400)
                self.write(ujson.dumps({"error":str(e)}))
                self.finish()
