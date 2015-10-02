import tornado.web
import ujson
import pandas
import StringIO

import metrics.work_queue

from twisted.internet import defer
from lib.helpers import * 

class WorkQueueHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, *args, **kwargs):
        self.zookeeper = zookeeper

    @decorators.formattable
    def get_content(self,data):
        
        def default(self,data):
            o = Convert.df_to_json(data)
            html = data.to_html(classes=["dataframe"])
            self.render("admin/logins.html", data=html)
            

        yield default, (data,)

    def clear_queue(self):
        self.zookeeper.delete("/python_queue",recursive=True)
        self.zookeeper.ensure_path("/python_queue")
        self.redirect("/admin/work_queue")

    def clear_active(self):
        self.zookeeper.delete("/active_pattern_cache",recursive=True)
        self.zookeeper.ensure_path("/active_pattern_cache")
        self.redirect("/admin/work_queue/active")

    def get_data(self):
        import pickle

        path_queue = [c for c in self.zookeeper.get_children("/python_queue") ]
        def parse(x):
            values = pickle.loads(self.zookeeper.get("/python_queue/" + path)[0])
            print values
            return values[1]

        in_queue = [parse(path) for path in path_queue]

        df = pandas.DataFrame(in_queue)
        self.get_content(df)
         

    def get_current(self):
        import pickle

        in_queue = [c for c in self.zookeeper.get_children("/active_pattern_cache") ]
        len_queue = [len(self.zookeeper.get_children("/active_pattern_cache/" + q)) for q in in_queue]
        complete_queue = [len(self.zookeeper.get_children("/complete_pattern_cache/" + q)) for q in in_queue]


        df = pandas.DataFrame({"queue":in_queue,"active":len_queue,"complete":complete_queue})
        self.get_content(df)
     

    @tornado.web.asynchronous
    def get(self,action=""):
        print action
        if action == "":
            self.get_data()
        elif action == "clear":
            self.clear_queue()
        elif "active/clear" in action:
            self.clear_active()
        elif "active" in action:
            self.get_current()
