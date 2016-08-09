import tornado.ioloop
import tornado.web
import tornado.httpserver

from lib.custom_logging.check_logger import KafkaHandler
from lib.kafka_stream import kafka_stream
import sys

import tornado.platform.twisted
tornado.platform.twisted.install()

from twisted.internet import reactor
from tornado.options import define, options, parse_command_line

from routes import AllRoutes
from connectors import ConnectorConfig
from shutdown import sig_wrap
from handlers import streaming
from lib.kafka_queue import KafkaQueue

import requests
import signal
import logging
import os

requests_log = logging.getLogger("requests")
requests_log.setLevel(logging.WARNING)

dirname = os.path.dirname(os.path.realpath(__file__))
route_options = ", ".join(AllRoutes.get_all()) 

define("port", default=8080, help="run on the given port", type=int)
define("listen_port", default=1234, help="run on the given port", type=int)
define("view_port", default=1235, help="run on the given port", type=int)
define("skip_db", default=False,type=bool)
define("skip_reporting_db", default=False,type=bool) 
define("skip_console_api", default=False,type=bool) 
define("skip_bidder_api", default=False,type=bool) 
define("skip_buffers", default=False,type=bool) 
define("skip_redis", default=False,type=bool) 
define("include_hive", default=False,type=bool)  
define("skip_filtered_imps", default=False,type=bool)   
define("skip_conversion_imps", default=False,type=bool)    
define("skip_conversion_events", default=False,type=bool)     
define("skip_visit_events", default=False,type=bool)      
define("skip_spark_sql", default=False,type=bool)      
define("skip_cassandra", default=False,type=bool)      
define("skip_mongo", default=False,type=bool)      
define("skip_marathon", default=False,type=bool)      
define("skip_zookeeper", default=False,type=bool)      
define("include_crusher_api", default=False, type=bool)
define("log_kafka", default=False, type=bool)
define("app_name", default="")



define("no_internet",default=False, help="turns off things that require internet connection",type=bool)
define("routes",default="", help="list of routes to include: \n" + route_options,type=str) 
define("show_routes",default=False, help="will print a list of the available routes",type=bool)  



def build_routes(connectors,override=[]):
    routes = AllRoutes(**connectors)
    static = [(r'/static/(.*)', tornado.web.StaticFileHandler, {'path': "static"})]
    selected_routes = [route for route in routes.all if route in override]
    all_routes = routes.all
    all_routes.remove('work_queue_routes')
    return routes(*(selected_routes or all_routes)) + static


if __name__ == '__main__':
    parse_command_line()

    connectors = ConnectorConfig(
        options.skip_db,
        options.skip_reporting_db,
        options.no_internet or options.skip_console_api,
        options.no_internet or options.skip_bidder_api,
        options.skip_buffers,
        options.no_internet or options.skip_redis,
        options.include_hive,
        options.no_internet or options.skip_filtered_imps,
        options.no_internet or options.skip_conversion_imps,
        options.no_internet or options.skip_conversion_events, 
        options.no_internet or options.skip_visit_events,
        options.no_internet or options.skip_spark_sql,
        options.no_internet or options.skip_cassandra,
        options.no_internet or options.skip_mongo,
        options.no_internet or options.skip_marathon,
        options.no_internet or options.skip_zookeeper,
        options.include_crusher_api

    ).connectors

    routes = [r for r in options.routes.split(",") if len(r)]

    if options.log_kafka:
        producer = kafka_stream.KafkaStream('hindsight_log',"slave17:9092",True,False,False,10,1,False)

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

    if options.show_routes:
        AllRoutes().__mock_all__(routes)
        os._exit(1)


    app = tornado.web.Application(
        build_routes(connectors,routes), 
        template_path= dirname + "/templates",
        debug=True,
        cookie_secret="rickotoole",
        login_url="/login"
    )
    reactor.suggestThreadPoolSize(100)

    if not options.skip_buffers and not options.show_routes:
        # startup the buffers
        for queue,buf in connectors["buffers"].items():
            reactor.callInThread(connectors[queue],buf,streaming.BufferControl())

    import work_queue

    #for _ in range(0,2):
    #    reactor.callInThread(work_queue.WorkQueue(connectors['zookeeper']))

    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)
    sig_handler = sig_wrap(reactor,server)

    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)

    tornado.ioloop.IOLoop.instance().start()
