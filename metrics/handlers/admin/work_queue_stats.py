import tornado.web
import ujson
import pandas
import StringIO

import metrics.work_queue

from twisted.internet import defer
from lib.helpers import * 

class WorkQueueStatsHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, *args, **kwargs):
        self.zookeeper = zookeeper

    def getBreakdown(self):
        import pickle
        import hashlib
        import datetime
        path_queue = [c for c in self.zookeeper.get_children("/python_queue") ]
        index_counter = 0
        def parse(x):
            try:
                values = pickle.loads(self.zookeeper.get("/python_queue/" + path)[0])
                job_id = hashlib.md5(self.zookeeper.get("/python_queue/" + path)[0]).hexdigest()
                print values
                rvals = values[1]
                advertiser = rvals[0]
                last_item = rvals[len(rvals)-1]

                if last_item == "recurring_cassandra_cache":
                    time_string = rvals[len(rvals)-1]
                    script_name = time_string.split("|")[1]
                else:
                    time_string = rvals[len(rvals)-2]
                    script_name = time_string.split("|")[1]
               
                time = datetime.datetime.strptime(time_string.split("|")[0], "%Y-%m-%d %H:%M:%S")
                time_dict = {"advertiser": {index_counter: advertiser}, "script_type": {index_counter: script_name}, "date":{index_counter:""}}
                time_dict['date'][index_counter] = time.strftime('%Y-%m-%d %H:%M')
                #time_dict['hour'][index_counter] = str(time.hour)
                #time_dict['minute'][index_counter] = str(time.minute)
                df = pandas.DataFrame(time_dict)
                self.time_df = self.time_df.append(df)
                
                rvals.append(job_id)
                return rvals
            except:
                print "Error parsing pickle job"
                return False
        
        self.time_df = pandas.DataFrame()
        in_queue = [parse(path) for path in path_queue]
        in_queue = [i for i in in_queue if i]
        
        if len(self.time_df)> 0:
            adv_df = self.time_df.groupby(['advertiser']).count()
            adv_df = adv_df.filter(['script_type'])
            adv_df.columns = ['count']
            adv_df = adv_df.reset_index()

            script_df = self.time_df.groupby(['script_type']).count()
            script_df = script_df.filter(['advertiser'])
            script_df.columns = ['count']
            script_df = script_df.reset_index()

            #hour_df = self.time_df.groupby(['hour']).count()
            #hour_df = hour_df.filter(['advertiser'])
            #hour_df.columns = ['count']
            #hour_df = hour_df.reset_index()

            minute_df = self.time_df.groupby(['date']).count()
            minute_df = minute_df.filter(['advertiser'])
            minute_df.columns = ['count']
            minute_df = minute_df.reset_index()

            #organize data into tree structure and write that
            obj_to_write = {"time_count": minute_df.to_dict('records'), "advertiser_count":adv_df.to_dict('records'),"script_type_count": script_df.to_dict('records'), "total_list": self.time_df.to_dict('records')}

            #self.write(ujson.dumps(self.time_df.to_dict('records')))
            #self.write(ujson.dumps(hour_df.to_dict('records')))
            #self.write(ujson.dumps(adv_df.to_dict('records')))
            #self.write(ujson.dumps(script_df.to_dict('records')))
            #self.write(ujson.dumps(minute_df.to_dict('records')))
            self.write(ujson.dumps(obj_to_write, sort_keys=True))
            self.finish()
        else:
            self.write(ujson.dumps({"number_in_queue": 0}))
            self.finish()

    def getnum(self):
        path_queue = [c for c in self.zookeeper.get_children("/python_queue")]
        self.counter=0
        def parse(x):
            self.counter = self.counter+1
        
        in_queue= [parse(path) for path in path_queue]
        
        self.write(ujson.dumps({"number":self.counter}))
        self.finish()


    def get_data(self):
        import pickle
        import hashlib
        path_queue = [c for c in self.zookeeper.get_children("/python_queue") ]
        def parse(x):
            try:
                values = pickle.loads(self.zookeeper.get("/python_queue/" + path)[0])
                job_id = hashlib.md5(self.zookeeper.get("/python_queue/" + path)[0]).hexdigest()
                print values
                rvals = values[1]
                rvals.append(job_id)
                return rvals
            except:
                print "Error parsing pickle job"
                return False

        in_queue = [parse(path) for path in path_queue]
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
        elif "breakdown" in action:
            self.getBreakdown()
        elif "num" in action:
            self.getnum()
