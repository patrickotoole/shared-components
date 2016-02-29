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

            paths = """
            <div class="col-md-3">
              <h5>Work queue pages:</h5>
              <a href="/admin/work_queue">View queue</a><br>
            </div>
            <div class="col-md-3">
              <a class="btn btn-danger btn-sm" href="/admin/work_queue/clear">Clear queue</a><br><br>
            </div>

            <div class="col-md-3">

              <h5>Backfill pages:</h5>
              <a href="/admin/work_queue/backfill">Backfill jobs</a><br>
              <a href="/admin/work_queue/backfill/active">Backfill jobs active</a><br>
              <a href="/admin/work_queue/backfill/stalled">Backfill jobs (stalled)</a><br>
              <a href="/admin/work_queue/backfill/complete">Backfill jobs (complete)</a><br>

            </div>
            <div class="col-md-3">
              <a class="btn btn-danger btn-sm" href="/admin/work_queue/backfill/clear">Clear Backfill</a><br>
            </div>
            <br><br>
            """

            self.render("admin/datatable.html", data=html, paths=paths)
            

        yield default, (data,)

    def clear_queue(self):
        self.zookeeper.delete("/python_queue",recursive=True)
        self.zookeeper.ensure_path("/python_queue")
        self.redirect("/admin/work_queue")

    def clear_active(self):
        self.zookeeper.delete("/active_pattern_cache",recursive=True)
        self.zookeeper.ensure_path("/active_pattern_cache")
        self.redirect("/admin/work_queue/backfill")

    def clear_complete(self):
        self.zookeeper.delete("/complete_pattern_cache",recursive=True)
        self.zookeeper.ensure_path("/complete_pattern_cache")
        self.redirect("/admin/work_queue/backfill")


    def get_data(self):
        import pickle

        path_queue = [c for c in self.zookeeper.get_children("/python_queue") ]
        def parse(x):
            try:
                values = pickle.loads(self.zookeeper.get("/python_queue/" + path)[0])
                print values
                return values[1]
            except:
                print "Error parsing pickle job"
                return False

        in_queue = [parse(path) for path in path_queue]
        in_queue = [i for i in in_queue if i]

        if len(in_queue) > 0:
            df = pandas.DataFrame(in_queue)
        else:
            df = pandas.DataFrame({"items":[]})
        self.get_content(df)
         
    def get_complete(self,q):
        try:
            return len(self.zookeeper.get_children("/complete_pattern_cache/" + q))
        except:
            return 0

    def get_active(self,q):
        try:
            return len(self.zookeeper.get_children("/active_pattern_cache/" + q))
        except:
            return 0

    def get_all_complete(self):

        in_queue = [c for c in self.zookeeper.get_children("/complete_pattern_cache") ]
        complete_queue = [len(self.zookeeper.get_children("/complete_pattern_cache/" + q)) for q in in_queue]
        active_queue = [self.get_active(q) for q in in_queue]

        df = pandas.DataFrame({"queue":in_queue,"active":active_queue,"complete":complete_queue})

        self.get_content(df)
 

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

    def clear_current(self):
        import pickle

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
    def get(self,action=""):
        print action
        if action == "":
            self.get_data()
        elif action == "clear":
            self.clear_queue()
        elif "backfill/active" in action:
            self.get_current(True)
        elif "backfill/stalled" in action:
            self.get_current("stalled")
        elif "backfill/clear" in action:
            self.clear_active()
        elif "backfill/complete/clear" in action:
            self.clear_complete()
        elif "backfill/complete" in action:
            self.get_all_complete()
        elif "backfill" in action:
            self.get_current()
