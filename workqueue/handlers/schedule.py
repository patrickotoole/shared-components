import tornado.web
import ujson
import pandas
import StringIO
import logging
import work_queue
import logging
import pickle
import hashlib
import datetime

from twisted.internet import defer

INSERT = "insert into workqueue_scripts_schedule (workqueue_script_id, days, time) values (%(id)s, %(days)s, %(time)s)"
GETID = "select id from workqueue_scripts where name = '%s'"
DELETE = "delete from workqueue_scripts_schedule where workqueue_script_id = %(name)s and days=%(day)s and time=%(time)s"

class ScheduleHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, crushercache=None, *args, **kwargs):
        self.zookeeper = zookeeper
        self.crushercache = crushercache

    def add_to_db(self, request_body):
        data = ujson.loads(request_body)
        if data.get("type",False):
            if data['type'] =="delete":
                self.crushercache.execute(DELETE,data)
        else:
            jobid = self.crushercache.select_dataframe(GETID % data['name'])
            data['id'] = jobid['id'][0]
            self.crushercache.execute(INSERT, data)

    @tornado.web.asynchronous
    def get(self):
        try:
            df = self.crushercache.select_dataframe("select * from workqueue_scripts_schedule")
            data = {'values':[]}
            for item in df.iterrows():
                data['values'].append({"days":item[1]['days'], "time":item[1]["time"], "active": item[1]['active'],"run everytime":item[1]["run_everytime"],"deleted":item[1]['deleted'], "last_activty":str(item[1]['last_activity']), "id":item[1]['workqueue_script_id'], "remove":""})
            self.render("scheduledatatable.html", data=data, paths="")
        except Exception, e:
            self.set_status(400)
            self.write(ujson.dumps({"error":str(e)}))
            self.finish()

    @tornado.web.asynchronous
    def post(self):
        try:
            self.add_to_db(self.request.body)
            self.write(ujson.dumps({"success":"True"}))
            self.finish()
        except Exception, e:
            self.set_status(400)
            self.write(ujson.dumps({"error":str(e)}))
            self.finish()


class ScheduleNewHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, crushercache=None, *args, **kwargs):
        self.zookeeper = zookeeper
        self.crushercache = crushercache

    def get_content_schedule(self,data):

        self.render("newscheduledatatable.html", data="", paths="")


    def get_data_schedule(self):
        import pandas
        df = self.crushercache.select_dataframe("select name from recurring_scripts where active = 1 and deleted = 0")
        self.get_content_schedule(df.to_dict("records"))

    @tornado.web.asynchronous
    def get(self):
        self.get_data_schedule()
