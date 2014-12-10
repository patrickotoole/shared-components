import tornado.ioloop
import tornado.web
import tornado.httpserver

import tornado.platform.twisted
tornado.platform.twisted.install()

from twisted.internet import reactor
from tornado.options import define, options, parse_command_line

from routes import AllRoutes
from connectors import ConnectorConfig
from shutdown import sig_wrap
from handlers import streaming

import requests
import signal
import logging
import os


requests_log = logging.getLogger("requests")
requests_log.setLevel(logging.WARNING)

dirname = os.path.dirname(os.path.realpath(__file__))

define("port", default=8080, help="run on the given port", type=int)
define("listen_port", default=1234, help="run on the given port", type=int)
define("view_port", default=1235, help="run on the given port", type=int)
define("skip_db", default=False,type=bool)
define("skip_reporting_db", default=False,type=bool) 
define("skip_console_api", default=False,type=bool) 
define("skip_bidder_api", default=False,type=bool) 
define("skip_buffers", default=False,type=bool) 
define("skip_redis", default=False,type=bool) 
define("skip_hive", default=False,type=bool)  
define("no_internet",default=False, help="turns off things that require internet connection",type=bool)


static = [
    (r'/static/(.*)', tornado.web.StaticFileHandler, {'path': "static"})
]

def build_routes(connectors):
    routes = AllRoutes(**connectors)
    return routes(*routes.all) + static



if __name__ == '__main__':
    parse_command_line()

    connectors = ConnectorConfig(
        options.skip_db,
        options.skip_reporting_db,
        options.no_internet or options.skip_console_api,
        options.no_internet or options.skip_bidder_api,
        options.skip_buffers,
        options.no_internet or options.skip_redis,
        options.no_internet or options.skip_hive
    ).connectors


    app = tornado.web.Application(
        build_routes(connectors), 
        template_path= dirname + "/templates",
        debug=True,
        cookie_secret="rickotoole",
        login_url="/login"
    )

    reactor.listenTCP(options.listen_port, streaming.track_factory)
    reactor.listenTCP(options.view_port, streaming.view_factory)  

    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)
    sig_handler = sig_wrap(reactor,server)

    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)

    tornado.ioloop.IOLoop.instance().start()
