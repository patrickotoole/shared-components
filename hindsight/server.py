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

from handlers.action import *
from handlers.dashboard import *
from handlers.cache import * 
from handlers.advertiser import *
from handlers.permissions import *
from handlers.login import *

if __name__ == '__main__':

    parse_command_line()

    connectors = {
        "db": lnk.dbs.rockerbox,
        "crushercache": lnk.dbs.crushercache,
    }


    #template_dir = dirname + "/templates"
    #static_dir = dirname + "/static"
    template_dir = "/".join(dirname.split("/")[:-1]) + "/metrics/templates"
    static_dir ="/".join(dirname.split("/")[:-1]) + "/metrics/static"
    shared_dir = "/".join(dirname.split("/")[:-1]) + "/shared/js"
    

    routes = [
        (r'/', LoginHandler, connectors),
        (r'/login', LoginHandler, connectors),
        (r'/logout', LoginHandler, connectors),
        (r'/account/permissions', AccountPermissionsHandler, connectors),
        (r'/crusher/funnel/action', ActionHandler, connectors),
        (r'/crusher/dashboard?', DashboardHandler, connectors),
        (r'/advertiser', AdvertiserHandler, connectors),
        (r'/crusher/v2/visitor/(.*?)/cache', CacheHandler,connectors),
        (r'/static/(.*)', tornado.web.StaticFileHandler, {'path': static_dir}),
        (r'/js/(.*)', tornado.web.StaticFileHandler, {'path': shared_dir}),
    ]

    app = tornado.web.Application(
        routes, 
        template_path= template_dir,
        debug=True,
        cookie_secret="rickotoole",
        login_url="/login"
    )
    
    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)

    tornado.ioloop.IOLoop.instance().start()
