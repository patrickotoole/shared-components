import tornado.websocket
import time
import redis
import datetime
import pandas
import ujson
import logging
import tornado.platform.twisted
from twisted.internet import  protocol, defer, threads
from twisted.protocols import basic
from ..base import BaseHandler
from streaming_base import StreamingBase
from lib.query.MYSQL import BRAND_QUERY

class ClientSingleton(dict):

    _instance = None
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ClientSingleton, cls).__new__(
                                cls, *args, **kwargs)
        return cls._instance


class BufferControl(dict):

    _instance = None
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(BufferControl, cls).__new__(
                                cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        self['on'] = False
     


clients = ClientSingleton()
buffer_control = BufferControl()

class IndexHandler(BaseHandler):

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        # self.render("v2_streaming.html",advertiser_id= self.current_advertiser)
        # self.render("v2_streaming_demo.html",advertiser_id="asdf")
        self.render("streaming/_streaming.html", advertiser_id=self.current_advertiser)


class StreamingHandler(StreamingBase,tornado.websocket.WebSocketHandler):
  
    def initialize(self,db,buffers={}):
        self.time_interval = 1
        self.control_buffer = buffer_control
        super(StreamingHandler,self).initialize(db=db,buffers=buffers)

    def generator_loop(self):

        start = time.time()
        base = { key:self.build_df(key) for key in self.buffers.keys()}
            
        for i,client in clients.iteritems():
            if client['enabled'] == False:
                continue

            masks = client.get('masks',False)
            dicts = { key: self.mask_select_convert(df,masks) for key, df in base.iteritems() }
            json = ujson.dumps(dicts,ensure_ascii=True)

            try:
                client['object'].write_message(json)
            except:
                client['object'].on_close()
            

        end = time.time()
        #logging.info(self.time_interval - (end - start))

        if len(clients.keys()) > 0:
            tornado.ioloop.IOLoop.instance().add_timeout(
                datetime.timedelta(seconds=self.time_interval - (end - start)),
                self.generator_loop
            )
        else:
            logging.info("buffer off")
            self.control_buffer['on'] = False

    def open(self, *args):
        self.id = self.get_argument("id","123")
        clients[self.id] = {"id": self.id, "object": self, "enabled":False}
        if len(clients.keys()) == 1:
            self.buffers['track'].clear()
            self.control_buffer['on'] = True
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
