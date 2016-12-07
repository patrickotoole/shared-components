import tornado.web
import json
import pandas
import StringIO

import work_queue

from twisted.internet import defer
from lib.helpers import * 

class WorkQueueHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, *args, **kwargs):
        self.db = kwargs.get("crushercache",None)
        self.zookeeper = zookeeper

 
    @tornado.web.asynchronous
    def get(self):
        self.render("index.html")
