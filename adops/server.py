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


from handlers import *
from link import lnk



if __name__ == '__main__':

    parse_command_line()

    connectors = {
    "db" : lnk.dbs.rockerbox
    }

    routes = [
        (r'/', AdopsBaseHandler, connectors),
        (r'/(.*?)', AdopsHandler, connectors)
    ]

    app = tornado.web.Application(
        routes, 
        template_path= dirname,
        debug=True,
        cookie_secret="rickotoole",
        login_url="/login"
    )
    
    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)

    tornado.ioloop.IOLoop.instance().start()
