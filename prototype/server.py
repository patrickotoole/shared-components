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
from kazoo.client import KazooClient


dirname = os.path.dirname(os.path.realpath(__file__))
define("port", default=8888, help="run on the given port", type=int)

from link import lnk

from handlers.api import *
from handlers.login import *
from handlers.permissions import *

if __name__ == '__main__':

    parse_command_line()

    connectors = {
        "db": lnk.dbs.rockerbox,
        "crushercache": lnk.dbs.crushercache,
        "prototype": lnk.dbs.crushercache,
    }


    static_dir = dirname + "/static"
    template_dir = "/".join(dirname.split("/")[:-1]) + "/metrics/templates"
    #static_dir ="/".join(dirname.split("/")[:-1]) + "/metrics/static"
    shared_dir = "/".join(dirname.split("/")[:-1]) + "/shared/js"
    

    routes = [

        (r'/', LoginHandler, connectors),
        (r'/login', LoginHandler, connectors),
        (r'/logout', LoginHandler, connectors),
        (r'/account/permissions', AccountPermissionsHandler, connectors),
        (r'/static/(.*)', tornado.web.StaticFileHandler, {'path': static_dir}),
        (r'/js/(.*)', tornado.web.StaticFileHandler, {'path': shared_dir}),


        (r'/prototype/(.*?)', ApiHandler, connectors),
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
