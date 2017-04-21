import tornado.ioloop
import tornado.web
import tornado.httpserver

import tornado.platform.twisted
tornado.platform.twisted.install()

from twisted.internet import reactor
from tornado.options import define, options, parse_command_line

#from lib.custom_logging.check_logger import KafkaHandler
from wqloghandler import *
from lib.kafka_stream import kafka_stream
import sys
from logging import Handler
from logging import StreamHandler

from timekeeper import timeKeeper
from routes import AllRoutes
from connectors import ConnectorConfig
from shutdown import sig_wrap
from work_queue_metrics import Metrics
from work_queue_metrics import TimeMetric
from metricCounter import MetricCounter
from zookeeper_interface import *
from work_containers import *

from handlers.handler import *
from handlers.jobs import *
from handlers.schedule import *
from handlers.workqueuelog import *
from handlers.cache import *
from handlers.checkshandler import *
from handlers.job_status import *
from handlers.clear_queue import *
from handlers.remove import *
from handlers.checksegment import *
from handlers.checkfires import *

import requests
import signal
import logging
import os

requests_log = logging.getLogger("requests")
requests_log.setLevel(logging.WARNING)

dirname = os.path.dirname(os.path.realpath(__file__))
template_dir = "/".join(dirname.split("/")[:-1]) +"/workqueue/templates"
static_dir = "/".join(dirname.split("/")[:-1]) +"/workqueue/static"

define("port", default=8080, help="run on the given port", type=int)

def build_routes(connectors,override=[]):
    routes = [
        (r'/jobs', JobsHandler, connectors),
        (r'/jobs/new', JobsNewHandler, connectors),
        (r'/schedule', ScheduleHandler, connectors),
        (r'/cache', CacheHandler, connectors),
        (r'/job_status', StatusHandler, connectors),
        (r'/clear', ClearHandler, connectors),
        (r'/remove', RemoveHandler, connectors),
        (r'/logging/?(.*?)',WQLog, connectors),
        (r'/check/cache',ChecksHandler, connectors),
        (r'/check/segment',CheckSegmentHandler, connectors),
        (r'/check/pixel',CheckFiresHandler, connectors),
        (r'/', WorkQueueHandler, connectors),

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
    define("priority", default=0)

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

    connectors['zk'] = connectors['zookeeper']

    def create_log_object(logname):
        log_object = logging.getLogger(logname)
        log_object.setLevel(logging.INFO)
        
        myhandler = CustomLogHandler(sys.stderr)

        log_object.addHandler(myhandler)
        log_object.propagate = 0
        return log_object

    import work_queue
    import sys
  
    num_worker= options.num_workers

    tks = []
    mc = MetricCounter()
    work_containers=[]

    zookeeper_path = "/python_queue"
    if options.debug:
        zookeeper_path = "/python_queue_debug"
    if not connectors['cassandra']:
        logging.info("connectors not received properly")
        sys.exit(1)

    priority_cutoff = int(options.priority)
    connectors['zk_wrapper'] = ZKApi(connectors['zookeeper'], zookeeper_path, priority_cutoff)

    #create thread create objects for number of workers, in thread populate each object with one item of work 
    #work_containers = tuple({"entry_id":None, "data":None} for x in range(0,num_worker))

    for i in range(0, num_worker):
        tk = timeKeeper()
        loggername = "log_object_%s" % i
        work_containers.append({"entry_id":None, "data":None})
        tks.append(tk)
        reactor.callInThread(work_queue.WorkQueue(options.exit_on_finish, work_containers[i],reactor, tks[i], mc, connectors, create_log_object(loggername)))
        reactor.callInThread(TimeMetric(reactor, tks[i]))

    reactor.callInThread(WorkContainers(work_containers, connectors['zk_wrapper']))
    reactor.callInThread(Metrics(reactor,tks, mc,connectors))   


    app = tornado.web.Application(
        build_routes(connectors),
        template_path= template_dir,
        debug=True,
        cookie_secret="rickotoole",
        login_url="/login"
    )


    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)
    
    sig_handler = sig_wrap(reactor,server)
    
    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)
    
    tornado.ioloop.IOLoop.instance().start()  
