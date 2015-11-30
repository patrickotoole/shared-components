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

import requests
import signal
import logging
import os

requests_log = logging.getLogger("requests")
requests_log.setLevel(logging.WARNING)

dirname = os.path.dirname(os.path.realpath(__file__))
route_options = ", ".join(AllRoutes.get_all()) 

define("port", default=8080, help="run on the given port", type=int)


def build_routes(connectors,override=[]):
    routes = AllRoutes(**connectors)
    static = [(r'/static/(.*)', tornado.web.StaticFileHandler, {'path': "static"})]
    selected_routes = [route for route in routes.all if route in override]

    return routes(*(selected_routes or routes.all)) + static


if __name__ == '__main__':
    parse_command_line()

    connectors = ConnectorConfig(
        False,
        True,
        True,
        True,
        True,
        True,
        False,
        True,
        True,
        True, 
        True,
        True,
        False,
        True,
        True
    ).connectors

    connectors['zk'] = connectors['zookeeper']
    routes = ["work_queue_scripts"] 

    app = tornado.web.Application(
        build_routes(connectors,routes), 
        template_path= dirname + "/templates",
        debug=True,
        cookie_secret="rickotoole",
        login_url="/login"
    )

    import work_queue

    for _ in range(0,1):
        reactor.callInThread(work_queue.WorkQueue(connectors['zookeeper'],connectors))


    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)
    sig_handler = sig_wrap(reactor,server)

    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)

    tornado.ioloop.IOLoop.instance().start()

