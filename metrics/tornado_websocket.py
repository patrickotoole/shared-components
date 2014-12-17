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
define("skip_hive", default=False,type=bool)  
define("no_internet",default=False, help="turns off things that require internet connection",type=bool)
define("routes",default="", help="list of routes to include: \n" + route_options,type=str) 
define("show_routes",default=False, help="will print a list of the available routes",type=bool)  





def build_routes(connectors,override=[]):
    routes = AllRoutes(**connectors)
    static = [(r'/static/(.*)', tornado.web.StaticFileHandler, {'path': "static"})]
    selected_routes = [route for route in routes.all if route in override]

    return routes(*(selected_routes or routes.all)) + static

def test_the_thread(x,buffer_control):
    # fill up the imps_buffer from kafka
    from kafka import KafkaClient, MultiProcessConsumer
    import ujson
    kafka = KafkaClient("slave6:9092")
    consumer = MultiProcessConsumer(kafka, "none","imps")
    for message in consumer.get_messages(count=1000):
        print message
        if buffer_control['on']:
            j = ujson.loads(message.message.value)
            obj = dict(j['bid_request']['bid_info'].items() + j['bid_request']['tags'][0].items())

            # wrangling
            obj['creative'] = 0 
            obj['auction_id'] = obj['auction_id_64']
            obj['user_id'] = str(obj['user_id_64'])
            if "703" in obj['user_id']:
                print obj['user_id'], obj['user_id'] == "7033212274983420963"
            obj['tag_id'] = obj['id']
            x += [obj]

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

    routes = [r for r in options.routes.split(",") if len(r)]

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

    reactor.listenTCP(options.listen_port, streaming.track_factory)
    reactor.listenTCP(options.view_port, streaming.view_factory)  
    reactor.callInThread(test_the_thread,streaming.imps_buffer,streaming.BufferControl())

    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)
    sig_handler = sig_wrap(reactor,server)

    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)

    tornado.ioloop.IOLoop.instance().start()
