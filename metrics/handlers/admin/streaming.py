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

from handlers.streaming.streaming_base import StreamingBase
from lib.query.MYSQL import BRAND_QUERY

clients = dict()

class IndexHandler(tornado.web.RequestHandler):

    @tornado.web.asynchronous
    def get(self):
        self.render("streaming/base.html")


class StreamingHandler(StreamingBase,tornado.websocket.WebSocketHandler):
  
    def initialize(self,db,buffers={}):
        self.time_interval = 1
        super(StreamingHandler,self).initialize(db=db,buffers=buffers)

    def generator_loop(self):

        start = time.time()
        base = { key:self.build_df(key) for key in self.buffers.keys()}
            
        for i,client in clients.iteritems():
            if client['enabled'] == False:
                continue

            masks = client.get('masks',False)
            dicts = { key: self.mask_select_convert(df,masks) for key, df in base.iteritems() }
            json = ujson.dumps(dicts)

            try:
                client['object'].write_message(json)
            except:
                client['object'].on_close()
            

        end = time.time()

        if len(clients.keys()) > 0:
            tornado.ioloop.IOLoop.instance().add_timeout(
                datetime.timedelta(seconds=self.time_interval - (end - start)),
                self.generator_loop
            )

    def open(self, *args):
        self.id = self.get_argument("id","123")
        clients[self.id] = {"id": self.id, "object": self, "enabled":False}
        if len(clients.keys()) == 1:
            self.buffers['track'].clear()
            self.generator_loop()

    def on_message(self, message):        
        try:
            masks = ujson.loads(message)
            clients[self.id]['masks'] = masks
            clients[self.id]['masks']['advertiser_id'] = [self.get_secure_cookie("advertiser")]
        except:
            pass

        if message == "start":
            clients[self.id]['enabled'] = True

        print "Client %s received a message : %s" % (self.id, message)
        
    def on_close(self):
        if self.id in clients:
            del clients[self.id]

    def on_connection_close(self):
        if self.id in clients:
            del clients[self.id]

        self.connection_closed = True



