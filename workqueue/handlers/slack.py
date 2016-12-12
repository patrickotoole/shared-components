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

INSERT = "insert into slack_log_match (regex, channel, message) values (%(regex)s, %(channel)s, %(message)s)"

class SlackHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, crushercache=None, *args, **kwargs):
        self.zookeeper = zookeeper
        self.crushercache = crushercache

    def add_to_db(self, request_body):
        data = ujson.loads(request_body)
        self.crushercache.execute(INSERT, data)

    @tornado.web.asynchronous
    def get(self):
        try:
            df = self.crushercache.select_dataframe("select * from slack_log_match")
            data = {'values':[]}
            for item in df.iterrows():
                data['values'].append({"channel":item[1]['channel'], "message":item[1]["message"], "regex":item[1]["regex"],"active":item[1]['active'], "deleted":item[1]['deleted']})
            self.render("slackdatatable.html", data=data, paths="")
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


class SlackNewHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, crushercache=None, *args, **kwargs):
        self.zookeeper = zookeeper
        self.crushercache = crushercache

    def get_content_schedule(self,data):
        self.render("slack.html", data="", paths="")


    def get_data_schedule(self):
        import pandas
        df = self.crushercache.select_dataframe("select name from recurring_scripts where active = 1 and deleted = 0")
        self.get_content_schedule(df.to_dict("records"))

    @tornado.web.asynchronous
    def get(self):
        self.get_data_schedule()
