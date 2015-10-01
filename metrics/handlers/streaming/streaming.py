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

import maxminddb
import redis
import os

maxmind_path = os.environ.get("MAXMIND_PATH",False)
if maxmind_path:
    reader = maxminddb.Reader(maxmind_path)
else:
    reader = dict()

from lib.buffered_socket.maxmind import MaxmindLookup

lookup = MaxmindLookup(reader)


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
        self.render("streaming/_streaming.html", advertiser_id=self.current_advertiser, user_id=self.current_user)


class StreamingHandler(StreamingBase,tornado.websocket.WebSocketHandler):

    def check_origin(self, origin):
        return True
  
    def initialize(self,db=None,buffers={}):
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
            streams = client.get('streams',['served_imps'])
            dicts = { key: df 
                for key, df in base.iteritems() 
                if type(df) is not pandas.DataFrame and key in streams
            }

               
            
            for key, df in base.iteritems():
                 if type(df) is pandas.DataFrame and key in streams:
                     dicts[key] = self.mask_select_convert(df,masks,key)

            try:
                dicts["served_imps"] = [ 
                    dict(imp.items() + lookup.get(imp['ip_address']).items()) 
                    for imp in dicts["served_imps"]
                ]
            except:
                print "EXCEPT"
                pass
             
            
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
        logging.info("current clients: " + str(clients))
        self.id = self.get_argument("id","123")
        logging.info("adding new client: " + self.id)
        
        #if (len(clients.keys()) < 10):
        """
        if self.request.headers['X-Real-Ip'] != '184.153.72.149':
            logging.info(self.request.headers['X-Real-Ip'])
            clients[self.id] = {"id": self.id, "object": self, "enabled":False}
        else:
            logging.info(self.request)
        """
        clients[self.id] = {"id": self.id, "object": self, "enabled":False}
        if len(clients.keys()) == 1 and self.control_buffer['on'] is False:
            #self.buffers['track'].clear()
            self.control_buffer['on'] = True
            self.generator_loop()

    def on_message(self, message):        
        if message.rstrip() == "initialize":
            logging.info("initializing: %s" % self.id)
        elif message.rstrip() == "start":
            logging.info("starting: %s" % self.id)
            clients[self.id]['enabled'] = True
        else:
            

            try:
                masks = ujson.loads(message)
                logging.info("client setting for %s: %s" % (self.id,str(masks)))
                streams = masks.get("streams",False)                                                                       
                if streams:                                                                                                
                    clients[self.id]['streams'] = streams                                                                  
                    del masks["streams"]      
                    clients[self.id]['masks'] = masks
                else:
                    clients[self.id]['masks'] = masks
                    clients[self.id]['masks']['advertiser_id'] = [self.get_secure_cookie("advertiser")]
                logging.info("updated clients : " + str(clients))
            except Exception as e:
                logging.info(e)


        print "Client %s received a message : %s" % (self.id, message)
        
    def on_close(self):
        if self.id in clients:
            del clients[self.id]

    def on_connection_close(self):
        if self.id in clients:
            del clients[self.id]

        self.connection_closed = True
