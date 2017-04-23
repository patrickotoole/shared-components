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

from handlers import * 


dirname = os.path.dirname(os.path.realpath(__file__))

define("port", default=9001, help="run on the given port", type=int)

from link import lnk

# from handlers.index import *


if __name__ == '__main__':

    parse_command_line()

    connectors = {
        "db": lnk.dbs.rockerbox,
        "api": lnk.api.console,
        "crusher": lnk.api.crusher,
        "crushercache": lnk.dbs.crushercache
    }

    routes = [
        (r'/', SetupHandler, connectors),
        (r'/setup', SetupHandler, connectors),
        (r'/domains', DomainsHandler, connectors),
        (r'/create', CampaignHandler, connectors),
        (r'/autorun', AutorunHandler, connectors)
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
