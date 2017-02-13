import tornado.websocket
import os
import logging
import json

import tornado.ioloop
import tornado.web
import tornado.httpserver
import tornado.platform.twisted

tornado.platform.twisted.install()

from twisted.internet import reactor
from shutdown import sig_wrap
from tornado.options import define, options, parse_command_line

dirname = os.path.dirname(os.path.realpath(__file__))

define("port", default=8888, help="run on the given port", type=int)

from link import lnk

from handlers.index import *
from handlers.submit import *
from handlers.api import *


if __name__ == '__main__':

    parse_command_line()

    connectors = {
        "db": lnk.dbs.crushercache,
        "rb": lnk.dbs.rockerbox,

        "api": lnk.api.console
    }

    routes = [
        (r'/', IndexHandler, connectors),
        (r'/submit', SubmitHandler, connectors),
        (r'/api/?(.*)', APIHandler, connectors),
        (r'/static/(.*)', tornado.web.StaticFileHandler, {"path":"static"}),
        (r'/js/(.*)', tornado.web.StaticFileHandler, {"path":"../shared/js"}),

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
