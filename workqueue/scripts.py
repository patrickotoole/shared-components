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

INSERT = "insert into recurring_scripts (name, script, days, time) values (%(name)s, %(code)s, %(days)s, %(time)s)"

class ScriptsHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, crushercache=None, *args, **kwargs):
        self.zookeeper = zookeeper
        self.crushercache = crushercache

    def add_to_db(self, request_body):
        data = ujson.loads(request_body)
        self.crushercache.execute(INSERT, data)

    @tornado.web.asynchronous
    def post(self, action=""):
        print action
        try:
            self.add_to_db(self.request.body)
            self.write(ujson.dumps({"success":"True"}))
            self.finish()
        except Exception, e:
            self.set_status(400)
            self.write(ujson.dumps({"error":str(e)}))
            self.finish()
