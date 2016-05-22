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

    def get_by_time(self):
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
                time_dict = {"advertiser": {index_counter: advertiser}, "script_type": {index_counter: script_name}, "date":{index_counter:""},"hour":{index_counter:""},"minute":{index_counter:""}}
                time_dict['date'][index_counter] = time.strftime('%Y-%m-%d')
                time_dict['hour'][index_counter] = str(time.hour)
                time_dict['minute'][index_counter] = str(time.minute)
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
            adv_df = adv_df.filter(['hour'])
            adv_df.columns = ['count']
            adv_df = adv_df.reset_index()

            script_df = self.time_df.groupby(['script_type']).count()
            script_df = script_df.filter(['advertiser'])
            script_df.columns = ['count']
            script_df = script_df.reset_index()

            hour_df = self.time_df.groupby(['hour']).count()
            hour_df = hour_df.filter(['advertiser'])
            hour_df.columns = ['count']
            hour_df = hour_df.reset_index()

            minute_df = self.time_df.groupby(['minute']).count()
            minute_df = minute_df.filter(['advertiser'])
            minute_df.columns = ['count']
            minute_df = minute_df.reset_index()

            self.write(ujson.dumps(self.time_df.to_dict('records')))
            self.write(ujson.dumps(hour_df.to_dict('records')))
            self.write(ujson.dumps(adv_df.to_dict('records')))
            self.write(ujson.dumps(script_df.to_dict('records')))
            self.write(ujson.dumps(minute_df.to_dict('records')))
            self.finish()
        else:
            self.write(ujson.dumps({"number_in_queue": 0}))
            self.finish()

    def get_data(self):
        import pickle
        import hashlib
        path_queue = [c for c in self.zookeeper.get_children("/python_queue") ]
        script_type_dict={}
        def parse(x):
            try:
                values = pickle.loads(self.zookeeper.get("/python_queue/" + path)[0])
                job_id = hashlib.md5(self.zookeeper.get("/python_queue/" + path)[0]).hexdigest()
                print values
                rvals = values[1]
                rvals_list = rvals.replace("[","").replace("]","").replace("'","").split(",")
                advertiser = rvals_list[0]
                if revals_list[len(rvals_list)-1] in script_type_dict.keys():
                    scritp_type_dict[revals_list[len(rvals_list)-1]] = scritp_type_dict[revals_list[len(rvals_list)-1]]+1
                else:
                    scritp_type_dict[revals_list[len(rvals_list)-1]] = 1
                #standardize args list across scripts
                rvals.append(job_id)
                return rvals
            except:
                print "Error parsing pickle job"
                return False

        in_queue= [parse(path) for path in path_queue]

        self.write(ujson.dumps(script_type_dict))
        self.finish()
 
    def get_size(self):
        path_queue = [c for c in self.zookeeper.get_children("/python_queue") ]
        def parse(x):
            try:
                print x
                return x
            except:
                print "Error parsing pickle job"
                return False
        
        in_queue = [parse(path) for path in path_queue]
        in_queue = [i for i in in_queue if i]

        size = len(in_queue)
        self.write(ujson.dumps({"Number_in_Queue":size}))
        self.finish()

    def get_current(self,active=False):

        in_queue = [c for c in self.zookeeper.get_children("/active_pattern_cache") ]
        len_queue = [len(self.zookeeper.get_children("/active_pattern_cache/" + q)) for q in in_queue]
        complete_queue = [self.get_complete(q) for q in in_queue]

        df = pandas.DataFrame({"queue":in_queue,"active":len_queue,"complete":complete_queue})

        if active is True:
            df = df[df['active'] > 0]
        elif active == "stalled":
            df = df[(df['active'] == 0) & (df['complete'] == 0)]
        self.get_content(df)

    @tornado.web.asynchronous
    def get(self, action=""):
        print action
        if action == "":
            self.get_size()
        elif "TEST" in action:
            self.get_by_time()
        elif "backfill/stalled" in action:
            self.get_current("stalled")
