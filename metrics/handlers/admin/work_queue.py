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
         

    @tornado.web.asynchronous
    def get(self):
        self.get_data()
