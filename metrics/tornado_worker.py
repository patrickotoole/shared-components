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
from work_queue_metrics import TimeMetric

import requests
import signal
import logging
import os

requests_log = logging.getLogger("requests")
requests_log.setLevel(logging.WARNING)

dirname = os.path.dirname(os.path.realpath(__file__))
route_options = ", ".join(AllRoutes.get_all()) 

define("port", default=8080, help="run on the given port", type=int)
define("routes",default="work_queue_routes", help="list of routes to include: \n" + route_options,type=str)

def build_routes(connectors,override=[]):
    routes = AllRoutes(**connectors)
    static = [(r'/static/(.*)', tornado.web.StaticFileHandler, {'path': "static"})]
    selected_routes = [route for route in routes.all if route in override]
    return routes(*(selected_routes or routes.all)) + static

if __name__ == '__main__':

    from lib.report.utils.loggingutils import basicConfig
    define("num_workers", default=1)
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
        False,
        True,
        False,
        True,
        True
    ).connectors

    connectors['zk'] = connectors['zookeeper']
    #routes = ["work_queue_scripts"] 
    #routes = []
    routes = options.routes

    app = tornado.web.Application(
        build_routes(connectors,routes), 
        template_path= dirname + "/templates",
        debug=True,
        cookie_secret="rickotoole",
        login_url="/login"
    )

    import work_queue
    import sys
  
    class metricCounter:
        def __init__(self):
            self.success = 0
            self.error = 0
            self.dequeue = 0

        def bumpSuccess(self):
            self.success = self.success+1
        
        def bumpError(self):
            self.error = self.error + 1

        def bumpDequeue(self):
            self.dequeue = self.dequeue+1

        def getSuccess(self):
            return self.success

        def getError(self):
            return self.error

        def getDequeue(self):
            return self.dequeue

    mc = metricCounter()
    num_worker= options.num_workers
    tks = []
    if not connectors['cassandra']:
        logging.info("connectors not received properly")
        sys.exit(1)

    for i in range(0, num_worker):
        tk = timeKeeper()
        tks.append(tk)    
    for _ in range(0,num_worker):
        
        reactor.callInThread(work_queue.WorkQueue(options.exit_on_finish, connectors['zookeeper'],reactor, tks[_], mc, connectors))
        reactor.callInThread(TimeMetric(reactor, tks[_]))

    reactor.callInThread(Metrics(reactor,tks, mc,connectors))

    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)
    
    sig_handler = sig_wrap(reactor,server)
    
    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)
    
    tornado.ioloop.IOLoop.instance().start()
    

