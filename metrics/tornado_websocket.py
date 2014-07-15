import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.httpserver

import tornado.platform.twisted
tornado.platform.twisted.install()

from twisted.internet import reactor, protocol, defer, threads
from twisted.protocols import basic
from tornado.options import define, options, parse_command_line

from handlers import streaming, reporting, user, analysis

import handlers.admin as admin

from lib.buffers.pixel_buffer import BufferedSocketFactory
from lib.buffers.view_buffer import ViewabilityBufferedFactory 

import redis
from lib.hive import Hive
from lib.link_sql_connector import DBCursorWrapper
from link import lnk

import signal
import requests
import logging
import time
import os

requests_log = logging.getLogger("requests")
requests_log.setLevel(logging.WARNING)

MAX_WAIT_SECONDS_BEFORE_SHUTDOWN = 1

define("port", default=8080, help="run on the given port", type=int)
define("listen_port", default=1234, help="run on the given port", type=int)
define("view_port", default=1235, help="run on the given port", type=int)

def sig_handler(sig, frame):
    logging.warning('Caught signal: %s', sig)
    tornado.ioloop.IOLoop.instance().add_callback_from_signal(shutdown)
 
def shutdown():
    logging.info('Stopping http server')
    try:
        reactor.stop()
    except:
        pass
    server.stop()
 
    logging.info('Will shutdown in %s seconds ...', MAX_WAIT_SECONDS_BEFORE_SHUTDOWN)
    io_loop = tornado.ioloop.IOLoop.instance()
 
    deadline = time.time() + MAX_WAIT_SECONDS_BEFORE_SHUTDOWN
 
    def stop_loop():
        now = time.time()
        if now < deadline and (io_loop._callbacks or io_loop._timeouts):
            io_loop.add_timeout(now + 1, stop_loop)
        else:
            io_loop.stop()
            logging.info('Shutdown')
    stop_loop()

       


db = lnk.dbs.mysql
api = None#lnk.api.console
bidder = None#lnk.api.console
hive = Hive().hive
_redis = redis.StrictRedis(host='162.243.123.240', port=6379, db=1)

socket_buffer = []
view_buffer = []


old_handlers = [
    (r'/debug', admin.lookback.DebugHandler), 
    (r'/uid.*', admin.lookback.UIDHandler),
    (r'/lookback.*', admin.lookback.LookbackHandler)
]

admin_scripts = [
    (r'/api.*', admin.scripts.APIHandler, dict(db=db)),
    (r'/pixel.*',admin.scripts.PixelHandler, dict(db=db,api=api,bidder=bidder)),
    (r'/targeting.*',admin.scripts.TargetingHandler, dict(redis=_redis,api=api,db=db)),
    (r'/bidder_profile.*',admin.scripts.ProfileHandler, dict(db=db,api=api,bidder=bidder)),
    (r'/advertiser.*',admin.scripts.AdvertiserHandler, dict(db=db,api=api)),
    (r'/money.*',admin.scripts.MoneyHandler, dict(db=db,api=api))
]

streaming = [
    (r'/streaming', streaming.IndexHandler),
    (r'/websocket', streaming.WebSocketHandler, 
      dict(db=db,socket_buffer = socket_buffer, view_buffer = view_buffer)
    )
]

admin_reporting = [
    (r'/viewable.*',admin.reporting.ViewabilityHandler, dict(db=db,api=api,hive=hive)),
    (r'/target_list.*',admin.reporting.TargetListHandler)
]

reporting = [
    (r'/reporting.*',reporting.ReportingHandler, dict(db=db,api=api,hive=hive)),
    (r'/login.*', user.LoginHandler, dict(db=db))
]

pixel_analysis = [
    (r'/analysis.*', analysis.PixelAnalysisHandler, dict(db=db,api=api,hive=hive))
]


dirname = os.path.dirname(os.path.realpath(__file__))
app = tornado.web.Application(
    streaming + admin_scripts + admin_reporting + reporting + pixel_analysis,
    template_path= dirname + "/templates",
    debug=True,
    db=lnk.dbs.mysql,
    cookie_secret="rickotoole",
    login_url="/login"
)

if __name__ == '__main__':
    parse_command_line()

    buffered_socket = reactor.listenTCP(options.listen_port,BufferedSocketFactory(socket_buffer))
    view_socket = reactor.listenTCP(options.view_port,ViewabilityBufferedFactory(view_buffer))

    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)

    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)

    tornado.ioloop.IOLoop.instance().start()
