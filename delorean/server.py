import tornado.websocket
import ujson
import os
import signal
import pandas

import tornado.ioloop
import tornado.web
import tornado.httpserver
import tornado.platform.twisted

tornado.platform.twisted.install()

from twisted.internet import reactor
from shutdown import sig_wrap
from tornado.options import define, options, parse_command_line

dirname = os.path.dirname(os.path.realpath(__file__))

define("port", default=9001, help="run on the given port", type=int)
define("log_kafka", default=False, type=bool)
define("app_name", default="")

import logging

logging.getLogger("kafka.consumer").setLevel(logging.WARNING)


from lib.kafka_queue import KafkaQueue
from handlers.streaming.streaming import StreamingHandler, clients
from handlers import streaming

class IndexHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        pass

    def get(self):
        self.render("index.html")

class DeloreanStreamingHandler(StreamingHandler):

    def initialize(self,db=None,buffers={},**kwargs):
        self.time_interval = 1
        super(DeloreanStreamingHandler,self).initialize(db=db,buffers=buffers)

    def build_df(self,key):
        # values: [{"segment":1,"uid":1},{"segment":1,"uid":1}]
        values = self.reset(key)

        if values:
            df = pandas.DataFrame(values).groupby("segment")['uid'].nunique().reset_index()
            return df.to_dict('records')
        return values

  
    def on_message(self, message):        
        try:
            masks = ujson.loads(message)
            streams = masks.get("streams",["segment_log"])
            if streams:
                clients[self.id]['streams'] = streams
                del masks["streams"] 
            clients[self.id]['masks'] = masks
        except:
            pass

        if message.rstrip() == "start":
            streams = ["segment_log"]
            if clients[self.id]:
                clients[self.id]['streams'] = streams
                clients[self.id]['enabled'] = True

        print "Client %s received a message : %s" % (self.id, message)
        
    




def build_routes(connectors,override=[]):
    routes = [
        (r'/', IndexHandler, connectors),
        (r'/static/(.*)', tornado.web.StaticFileHandler, {"path":"../metrics/static"}),
        (r'/websocket', DeloreanStreamingHandler, connectors)
    ]
    return routes


def parse_segment_log(s):
    # schema: "uid,segment:value:expiration"
    _split = s.split(",")
    return {
        "uid": _split[0],
        "segment": _split[1].split(":")[0]
    }

if __name__ == '__main__':

    parse_command_line()

    connectors = {
        "segment_log": KafkaQueue(mock_connect=False, topic="segment_log",transform=parse_segment_log),
        "buffers": {
            "segment_log": streaming.segment_log_buffer
        }
    }

    routes = build_routes(connectors)

    app = tornado.web.Application(
        routes, 
        template_path= dirname,
        debug=True,
        cookie_secret="rickotoole",
        login_url="/login"
    )
    for queue,buf in connectors["buffers"].items():
        reactor.callInThread(connectors[queue],buf,streaming.BufferControl())
    
    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)
    #sig_handler = sig_wrap(reactor,server)

    #signal.signal(signal.SIGTERM, sig_handler)
    #signal.signal(signal.SIGINT, sig_handler)

    tornado.ioloop.IOLoop.instance().start()
