import tornado.websocket
import copy
import time
import redis
import datetime
import pandas
import ujson
import tornado.platform.twisted
from twisted.internet import  protocol, defer, threads
from twisted.protocols import basic

from handlers.streaming.streaming import StreamingHandler, clients
from lib.query.MYSQL import BRAND_QUERY

class IndexHandler(tornado.web.RequestHandler):

    @tornado.web.asynchronous
    def get(self):
        self.render("admin/streaming.html")


class AdminStreamingHandler(StreamingHandler):
  
    def on_message(self, message):        
        try:
            masks = ujson.loads(message)
            streams = masks.get("streams",False)
            if streams:
                clients[self.id]['streams'] = streams
                del masks["streams"] 
            clients[self.id]['masks'] = masks
        except:
            pass

        if message == "start":
            clients[self.id]['enabled'] = True

        print "Client %s received a message : %s" % (self.id, message)
        
    
