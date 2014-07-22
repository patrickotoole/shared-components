import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.httpserver

import tornado.platform.twisted
tornado.platform.twisted.install()

from twisted.internet import reactor, protocol, defer, threads
from twisted.protocols import basic
from tornado.options import define, options, parse_command_line

from handlers import streaming, reporting, user

import handlers.admin as admin

from lib.buffers.pixel_buffer import BufferedSocketFactory
from lib.buffers.view_buffer import ViewabilityBufferedFactory 

from lib.buffered_socket.qs import QSBufferedSocketFactory
from lib.buffered_socket.schema import SchemaBufferedSocketFactory

from lib.buffered_socket.maxmind import MaxmindLookup
from lib.buffered_socket.redis import RedisApprovedUID
from lib.buffered_socket.domain import DomainLookup

import redis
import lib.hive as h
from lib.link_sql_connector import DBCursorWrapper
from link import lnk

import signal
import requests
import logging
import time
import os
import maxminddb

requests_log = logging.getLogger("requests")
requests_log.setLevel(logging.WARNING)

MAX_WAIT_SECONDS_BEFORE_SHUTDOWN = 1

define("port", default=8080, help="run on the given port", type=int)
define("listen_port", default=1234, help="run on the given port", type=int)
define("view_port", default=1235, help="run on the given port", type=int)


db = lnk.dbs.mysql
api = lnk.api.console
bidder = None#lnk.api.console
hive = h.Hive(n_map=3,n_reduce=3).hive
_redis = redis.StrictRedis(host='162.243.123.240', port=6379, db=1)
reader = maxminddb.Reader('/root/GeoLite2-City.mmdb')

track_buffer = []
view_buffer = []

pixel_parsers = {
    "ip_address":MaxmindLookup(reader),
    "uid":RedisApprovedUID([_redis]),
    "referrer": DomainLookup()
}

view_schema = ["auction_id", "uid", 
            "seller", "tag", "pub", "venue", "ecp", 
            "price", "creative", "visible", "elapsed", 
            "action", "ref", "parent"
        ]

track_factory = QSBufferedSocketFactory(track_buffer,pixel_parsers)
view_factory = SchemaBufferedSocketFactory(view_buffer,view_schema,pixel_parsers)

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
hive = h.Hive(n_map=3,n_reduce=3).hive
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
    (r'/streaming', streaming.streaming.IndexHandler),
    (r'/websocket', streaming.streaming.StreamingHandler, 
      dict(db=db,buffers={"track":track_buffer, "view":view_buffer})
    )
]

admin_reporting = [
    (r'/admin/streaming',admin.streaming.IndexHandler),
    (r'/admin/websocket', admin.streaming.AdminStreamingHandler, 
      dict(db=db,buffers={"track":track_buffer, "view":view_buffer})
    ),
    (r'/viewable.*',admin.reporting.ViewabilityHandler, dict(db=db,api=api,hive=hive))
    #(r'/target_list.*',admin.reporting.TargetListHandler)
]

reporting = [
    (r'/reporting.*',reporting.ReportingHandler, dict(db=db,api=api,hive=hive)),
    (r'/login.*', user.LoginHandler, dict(db=db)),
    (r'/', user.LoginHandler, dict(db=db)),
    (r'/signup.*', user.SignupHandler, dict(db=db))
]


dirname = os.path.dirname(os.path.realpath(__file__))
app = tornado.web.Application(
    streaming + admin_scripts + admin_reporting + reporting,
    template_path= dirname + "/templates",
    db=lnk.dbs.mysql,
    debug=True,
    cookie_secret="rickotoole",
    login_url="/login"
)


if __name__ == '__main__':
    parse_command_line()

    reactor.listenTCP(options.listen_port, track_factory)
    reactor.listenTCP(options.view_port, view_factory)

    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)

    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)

    tornado.ioloop.IOLoop.instance().start()
