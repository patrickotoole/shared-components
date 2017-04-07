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

    def initialize(self, crushercache=None, *args, **kwargs):
        self.crushercache = crushercache

    def add_to_db(self, request_body):
        data = ujson.loads(request_body)
        if data.get("type",False) and data['type'] == "delete":
            try:
                self.crushercache.execute(DELETE,data)
                self.write(ujson.dumps({"Status":"Success"}))
                self.finish()
            except:
                self.set_status(400)
                self.write(ujson.dumps({"Status":"Error", "Reason":"Script not in datbase could not delete"}))
                self.finish() 
        else:
            try:
                jobid = self.crushercache.select_dataframe(GETID % data['name'])
                data['id'] = jobid['id'][0]
                self.crushercache.execute(INSERT, data)
                self.write(ujson.dumps({"Status":"Success"}))
                self.finish()
            except:
                self.set_status(400)
                self.write(ujson.dumps({"Status":"Error", "Reason":"Script name in datbase"}))
                self.finish()

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
            self.write(ujson.dumps({"Error":str(e)}))
            self.finish()

    @tornado.web.asynchronous
    def post(self):
        self.add_to_db(self.request.body)

