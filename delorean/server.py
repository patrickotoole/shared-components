import tornado.websocket
import ujson
import os
import signal
import pandas
import logging

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


logging.getLogger("kafka.consumer").setLevel(logging.WARNING)

from helpers import *
from streaming_handler import *
from index_handler import *
from handlers import streaming

from lib.kafka_queue import KafkaQueue



if __name__ == '__main__':

    parse_command_line()

    connectors = {
        "segment_log": KafkaQueue(mock_connect=False, topic="segment_log",transform=parse_segment_log),
        "buffers": {
            "segment_log": streaming.segment_log_buffer
        }
    }

    routes = [
        (r'/', IndexHandler, connectors),
        (r'/static/(.*)', tornado.web.StaticFileHandler, {"path":"../metrics/static"}),
        (r'/websocket', DeloreanStreamingHandler, connectors)
    ]

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

    tornado.ioloop.IOLoop.instance().start()
