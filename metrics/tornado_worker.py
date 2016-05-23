import tornado.ioloop
import tornado.web
import tornado.httpserver

import tornado.platform.twisted
tornado.platform.twisted.install()

from twisted.internet import reactor
from tornado.options import define, options, parse_command_line

from timekeeper import timeKeeper
from routes import AllRoutes
from connectors import ConnectorConfig
from shutdown import sig_wrap
from work_queue_metrics import Metrics

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


class EX():
    def __init__(self):
        self.errored = False
    def ext(self):
        self.errored = True
        import sys
        sys.exit("Queue Empty")

if __name__ == '__main__':
    
    exi = EX()
    from lib.report.utils.loggingutils import basicConfig

    define("exit_on_finish", default=False)

    basicConfig(options={})

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
    import sys
    connectors['sys_exit'] = exi.ext
  
    tk = timeKeeper()
    for _ in range(0,1):
        reactor.callInThread(work_queue.WorkQueue(options.exit_on_finish, connectors['zookeeper'],reactor, tk, connectors))
        reactor.callInThread(TimeMetric(reactor, tk))
    
    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)
    
    sig_handler = sig_wrap(reactor,server)
    
    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)
    
    t = tornado.ioloop.IOLoop.instance()
    from shutdown import shutdown_wrap
    t.add_callback(shutdown_wrap(reactor,server))
    t.start()
    if reactor._stopped:
        reactor.crash()
        reactor._stopThreadPool()
        reactor.callInThread(sys.exit(1))
        t.add_callback(sys.exit)
        t._run_callback(sys.exit)
        t.make_current()
        t.clear_instance()
