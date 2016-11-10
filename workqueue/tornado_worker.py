import tornado.ioloop
import tornado.web
import tornado.httpserver

import tornado.platform.twisted
tornado.platform.twisted.install()

from twisted.internet import reactor
from tornado.options import define, options, parse_command_line

from lib.custom_logging.check_logger import KafkaHandler
from lib.kafka_stream import kafka_stream
import sys

from timekeeper import timeKeeper
from routes import AllRoutes
from connectors import ConnectorConfig
from shutdown import sig_wrap
from work_queue_metrics import Metrics
from work_queue_metrics import TimeMetric
from metricCounter import MetricCounter
from handler import *
from jobs import *
from scripts import *
from workqueuelog import *

import requests
import signal
import logging
import os

requests_log = logging.getLogger("requests")
requests_log.setLevel(logging.WARNING)

dirname = os.path.dirname(os.path.realpath(__file__))
template_dir = "/".join(dirname.split("/")[:-1]) +"/metrics/templates"
static_dir = "/".join(dirname.split("/")[:-1]) +"/metrics/static"

define("port", default=8080, help="run on the given port", type=int)

def build_routes(connectors,override=[]):
    routes = [
        (r'/jobs/?(.*?)', JobsHandler, connectors),
        (r'/scripts/?(.*?)', ScriptsHandler, connectors),
        (r'/', WorkQueueHandler, connectors),
        (r'/work_queue/?(.*?)',WorkQueueHandler, connectors),
        (r'/logging/?(.*?)',WQLog, connectors),
    ]
    static = [(r'/static/(.*)', tornado.web.StaticFileHandler, {'path': static_dir})]
    return routes + static

if __name__ == '__main__':

    from lib.report.utils.loggingutils import basicConfig
    define("num_workers", default=1)
    define("debug", default=False)
    define("exit_on_finish", default=False)
    define("log_kafka", default=False)
    define("app_name", default="")

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
        True,
        False,
        True
    ).connectors


    if options.log_kafka:
        producer = kafka_stream.KafkaStream('application_log',"slave17:9092,slave16:9092,slave40:9092",True,False,False,10,1,False)

        log_object = logging.getLogger()
        log_object.setLevel(logging.INFO)

        requests_log = logging.getLogger("kafka")
        requests_log.setLevel(logging.WARNING)

        ch = logging.StreamHandler(sys.stderr)
        ch.setLevel(logging.INFO)

        ch2 = KafkaHandler(producer, options.app_name)
        formater = logging.Formatter('%(asctime)s |%(name)s.%(funcName)s:%(lineno)d| %(message)s')
        ch2.setFormatter(formater)
        ch2.setLevel(logging.INFO)

        log_object.addHandler(ch2)


    app = tornado.web.Application(
        build_routes(connectors),
        template_path= template_dir,
        debug=True,
        cookie_secret="rickotoole",
        login_url="/login"
    )

    import work_queue
    import sys
  
    mc = MetricCounter()
    num_worker= options.num_workers
    tks = []
    zookeeper_path = "/python_queue"
    if options.debug:
        zookeeper_path = "/python_queue_debug"

    connectors['zk'] = connectors['zookeeper']
    if not connectors['cassandra']:
        logging.info("connectors not received properly")
        sys.exit(1)

    for i in range(0, num_worker):
        tk = timeKeeper()
        tks.append(tk)    
    for _ in range(0,num_worker):
        reactor.callInThread(work_queue.WorkQueue(options.exit_on_finish, connectors['zookeeper'],reactor, tks[_], mc, zookeeper_path, connectors))
        reactor.callInThread(TimeMetric(reactor, tks[_]))

    reactor.callInThread(Metrics(reactor,tks, mc,connectors))

    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)
    
    sig_handler = sig_wrap(reactor,server)
    
    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)
    
    tornado.ioloop.IOLoop.instance().start()
    
