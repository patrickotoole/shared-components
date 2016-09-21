import tornado.websocket
import time
import datetime
import pandas
import ujson
import tornado.platform.twisted
from twisted.internet import  protocol, defer, threads
from twisted.protocols import basic

from handlers.streaming.streaming import StreamingHandler, clients


class WQLog(tornado.web.RequestHandler):

    @tornado.web.asynchronous
    def get(self, rest_of_url):
        if "apps/all" in str(rest_of_url):
            self.render("workqueue/streaming_all_log.html")
        else:
            self.render("workqueue/streaming_log.html")
