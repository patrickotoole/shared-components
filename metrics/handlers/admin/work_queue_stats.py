import tornado.web
import ujson
import pandas
import StringIO
import logging
import metrics.work_queue
import logging
import pickle
import hashlib
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
        rvals.append(job_id)
        rvals.append(time)
        return rvals
    except:
        logging.info("Error parsing pickle job")
        return False

def parse2(x, zk):
    try:
        time = zk.get("/python_queue/" + x)[1][2]
        values = pickle.loads(zk.get("/python_queue/" + x)[0])
        job_id = hashlib.md5(zk.get("/python_queue/" + x)[0]).hexdigest()
        logging.info(values)
        rvals = values[1]
        rvals.append(job_id)
        return {"parameters":rvals, "time":time}
    except:
        logging.info("Error parsing pickle job")
        return False

def parse_get_id(x, zk, needed_job_id):
    try:
        zk.get(wq)
        values = pickle.loads(zk.get("/python_queue/" + x)[0])
        job_id= hashlib.md5(zk.get("/python_queue/" + x)[0]).hexdigest()
        logging.info(values)
        if values and str(needed_job_id) == job_id:
            logging.info(values)
            rvals = values[1]
            rvals.append(job_id)
            return rvals
        else:
            return False
    except:
        logging.info("Error parsing pickle job")

def parse_hash(x, zk):
        job_id= hashlib.md5(zk.get("/python_queue/" + x)[0]).hexdigest()
        logging.info(job_id)
        return job_id

class WorkQueueStatsHandler(tornado.web.RequestHandler, RPCQueue):

    def initialize(self, zookeeper=None, *args, **kwargs):
        self.zookeeper = zookeeper
        self.job = 0

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

            script_df = df.groupby([4]).count()
            script_df = script_df.filter([0])
            script_df.columns = ['count']
            script_df = script_df.reset_index()

            minute_df = df.groupby([7]).count()
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
                d1= parse2(entry, self.zookeeper)
                if d1:
                    sub_obj = {}
                    if len(d1['parameters'])>5:
                        sub_obj['entry']= entry
                        sub_obj['advertiser'] = d1['parameters'][0]
                        sub_obj['pattern']= d1['parameters'][1]
                        sub_obj['udf'] = d1['parameters'][2]
                        sub_obj['base_url'] = d1['parameters'][3]
                        sub_obj['identifier'] = d1['parameters'][4]
                        sub_obj['filter_id'] = d1['parameters'][5]
                    else:
                        sub_obj['entry']= entry
                        sub_obj['advertiser'] = d1['parameters'][0]
                        sub_obj['pattern']= d1['parameters'][1]
                        sub_obj['udf'] = d1['parameters'][3]
                        sub_obj['identifier'] = d1['parameters'][3]
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
        import datetime
        try:
            if _version:
                second_path = _version
            else:
                date = datetime.datetime.now().strftime("%m%y")
                second_path = "v{}".format(date)
            
            cq = CustomQueue.CustomQueue(self.zookeeper,"python_queue", "log", _version)
             
            needed_path = str(cq.get_secondary_path) + "/{}".format(job_id)
            entry_ids = self.zookeeper.get_children(needed_path)
            values = self.zookeeper.get("/python_queue/" + entry_ids[0])[0]
            
            if not priority_value:
                priority_value = 1
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
        self.write(ujson.dumps(df.to_dict('records')))
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

    @tornado.web.asynchronous
    def post(self, action=""):
        priority_value = self.get_argument("priority", False)
        _version = self.get_argument("version", False)
        print action
        if 'priority' in action:
            job_id = action.splti("/")[1]
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
