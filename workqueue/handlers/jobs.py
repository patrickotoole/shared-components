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
from RPCQueue import RPCQueue

from twisted.internet import defer

INSERT = "insert into workqueue_scripts (name, script) values (%(name)s, %(script)s)"
DELETE = "Delete from workqueue_scripts where name = %(name)s"

class JobsHandler(tornado.web.RequestHandler, RPCQueue):

    def initialize(self, crushercache=None, zk_wrapper=None, *args, **kwargs):
        self.crushercache = crushercache
        self.zk_wrapper = zk_wrapper

    def add_to_db(self,data):
        self.crushercache.execute(INSERT, data)
        result = {"Status":"Success"}
        return result

    def delete_from_db(self,data):
        self.crushercache.execute(DELETE, data)
        result = {"Status":"Success"}
        return result

    def add_to_queue(self,data):
        priority_value = 2
        _version = "v{}".format(datetime.datetime.now().strftime("%m%y"))
        try:
            if data.get('name', False) and 'udf' not in data.keys():
                data['udf'] = data['name']
            entry, job_id = self.add_to_work_queue(ujson.dumps(data))
            logging.info(entry)
            assert("entry" in entry)
            self.zk_wrapper.assert_in_queue(entry)
            assert(job_id)
            result = {"Status":"Success", "Job ID":job_id}
        except Exception, e:
            self.set_status(400)
            result = {"error":str(e)}
        return result


    @tornado.web.asynchronous
    def get(self):
        try:
            df = self.crushercache.select_dataframe("select * from workqueue_scripts")
            data = {'values':[]}
            for item in df.iterrows():
                data['values'].append({"name":item[1]['name'], "active":item[1]['active'], "deleted":item[1]['deleted'], "last_activty":str(item[1]['last_activity']), "Job ID":item[1]['id'], "Run Button":"", " Delete Button": ""})
            self.render("jobsdatatable.html", data=data, paths="")
        except Exception, e:
            self.set_status(400)
            self.write(ujson.dumps({"error":str(e)}))
            self.finish()

    @tornado.web.asynchronous
    def post(self):
        data = ujson.loads(self.request.body)
        if data.get('name',"").isdigit():
            name = self.crushercache.select_dataframe("select name from workqueue_scripts where id = %s" % data['name'])
            data['name'] = name['name'][0]
        funcs = {"add":self.add_to_db, "delete":self.delete_from_db, "other":self.add_to_queue}
        func = funcs[data.get("type","other")]
        result = func(data)
        self.write(ujson.dumps(result))
        self.finish()


class JobsNewHandler(tornado.web.RequestHandler):

    def initialize(self, crushercache=None, *args, **kwargs):
        self.crushercache = crushercache

    def get_content_schedule(self,data):

        self.render("newjobsdatatable.html", data="", paths="")


    def get_data_schedule(self):
        import pandas
        df = self.crushercache.select_dataframe("select name from recurring_scripts where active = 1 and deleted = 0")
        self.get_content_schedule(df.to_dict("records"))

    @tornado.web.asynchronous
    def get(self):
        self.get_data_schedule()
