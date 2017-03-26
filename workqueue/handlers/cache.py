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

def parse_for_id(x, zk, dq):
    time = zk.get("/python_queue/" + x)[1][2]
    values = pickle.loads(zk.get("/python_queue/" + x)[0])
    job_id = hashlib.md5(zk.get("/python_queue/" + x)[0]).hexdigest()
    logging.info(values)
    rvals = values[1]
    rvals['job_id']=job_id
    return {"parameters":rvals, "time":time}, dq


class CacheHandler(tornado.web.RequestHandler, RPCQueue):

    def initialize(self, zookeeper=None, *args, **kwargs):
        self.crushercache = kwargs.get("crushercache",None)
        self.zk_wrapper = kwargs.get("zk_wrapper",None)
        self.db = kwargs.get("db", None)

    def get_content(self,data, adv, patterns):
        def default(data, adv, patterns):
            o = json.dumps([{"class":"script","type":"select","key":"script","values":data,"adv":adv, "patterns": patterns}])

            self.render("cache.html", data=o, paths="")

        default(data, adv, patterns)


    def get_data(self):
        df = self.crushercache.select_dataframe("select name `key`, parameters, description from rpc_function_details where active = 1 and deleted = 0")
        df_adv = self.crushercache.select_dataframe("select advertiser from topic_runner_segments")
        df['parameters'] = df['parameters'].map(ujson.loads)
        advertisers = df_adv.to_dict("record")
        advertisers = [x['advertiser'] for x in advertisers]

        adv_patterns = self.db.select_dataframe("select * from action_with_patterns where pixel_source_name in %s" % str(advertisers).replace("[","(").replace("]",")"))
        advertiser_patterns={}
        for items in adv_patterns.iterrows():
               intermed = advertiser_patterns.get(items[1]['pixel_source_name'],{})
               intermed[items[1]['action_name']] = (items[1]['url_pattern'], items[1]['action_id'])
               advertiser_patterns[items[1]['pixel_source_name']] = intermed

        self.get_content(df.to_dict("records"),advertisers,advertiser_patterns)


    def get_id(self, _job_id, entry_id=False):
        try:
            date = datetime.datetime.now().strftime("%m%y")
            volume = "v{}".format(date)
            zk_path = "python_queue"
            if entry_id and entry_id.find("debug")>=0:
                zk_path = "python_queue_debug"
            needed_path = secondary_path = '{path}-{secondary_path}/{volume}/{job_id}'.format(
            path=zk_path, secondary_path="log", volume=volume, job_id=_job_id)

            entry_ids = self.zk_wrapper.zk.get_children(needed_path)
            logging.info(len(entry_ids))
            running_entries = [entry for entry in entry_ids if self.zk_wrapper.zk.get(needed_path + "/" + entry)[0]]
            df_entry={}
            df_entry['job_id']= _job_id
            if entry_id:
                df_entry['entry_id'] = str(entry_id).split("/")[2]
            df_entry['entries'] = []
            df_entry['finished'] = 0
            dq = 0
            for entry in entry_ids:
                try:
                    d1, dq = parse_for_id(entry, self.zk_wrapper.zk, dq)
                except:
                    d1 = []
                if d1:
                    sub_obj = {}
                    values = d1['parameters']
                    sub_obj = values
                    sub_obj['entry']= entry
                    timestamp = d1['time']
                    sub_obj['time'] = timestamp
                    df_entry['entries'].append(sub_obj)
                    d1['dequeued'] = dq
            df_entry['finished'] = dq - len(running_entries)
            df_entry['running'] = running_entries
            self.write(ujson.dumps(df_entry))
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


    def set_priority(self, job_id, priority_value, _version):
        try:
            needed_path = str(self.zk_wrapper.CustomQueue.get_secondary_path()) + "/{}".format(job_id)
            entry_ids = self.zk_wrapper.zk.get_children(needed_path)
            values = self.zk_wrapper.zk.get("/python_queue/" + entry_ids[0])[0]

            priority_value = int(priority_value)
            entry_id = self.zk_wrapper.write(values,priority_value, False)
            self.zk_wrapper.CustomQueue.delete(entry_ids)
            self.write(ujson.dumps({"result":"Success", "entry_id":entry_id}))
            self.finish()
        except Exception as e:
            self.set_status(400)
            self.write(ujson.dumps({"Error":str(e)}))
            self.finish()

    @tornado.web.asynchronous
    def get(self):
        self.get_data()


    @tornado.web.asynchronous
    def post(self):
        data = ujson.loads(self.request.body)
        priority_value = data.get("priority", 2)
        _version = data.get("version", "v{}".format(datetime.datetime.now().strftime("%m%y")))
        try:
            if "runall" in data.keys():
                entry, job_id = self.add_advertiser_to_wq(self.request.body)
                self.get_id(job_id, entry)
            else:
                entry, job_id = self.add_to_work_queue(self.request.body)
                self.get_id(job_id, entry)

            if (data.get('udf',False)):
                self.crushercache.execute("INSERT INTO cache_udf_submit (job_id,advertiser,udf,filter_id,pattern,submitted_by) VALUES (%s,%s,%s,%s,%s,%s)", (entry.split("/")[-1] + "_" + job_id,data['advertiser'],data['udf'],data['filter_id'],data['pattern'],data['submitted_by']))
        except Exception, e:
            self.set_status(400)
            self.write(ujson.dumps({"error":str(e)}))
            self.finish()
