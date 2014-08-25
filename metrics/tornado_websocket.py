import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.httpserver

import tornado.platform.twisted
tornado.platform.twisted.install()

from twisted.internet import reactor, protocol, defer, threads
from twisted.protocols import basic
from tornado.options import define, options, parse_command_line

from handlers import streaming, reporting, user, analysis, index, rbox_pixel

import handlers.admin as admin
from handlers.adminreport import AdminReportHandler
from lib.report.handlers import ReportingLogHandler

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
hive = h.Hive().hive
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

buffer_control = {"on":True}

track_factory = QSBufferedSocketFactory(track_buffer,pixel_parsers,buffer_control)
view_factory = SchemaBufferedSocketFactory(view_buffer,view_schema,pixel_parsers,buffer_control)

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

index = [
    (r'/admin/index', index.IndexHandler)
]

old_handlers = [
    (r'/debug', admin.lookback.DebugHandler),
    (r'/uid.*', admin.lookback.UIDHandler),
    (r'/lookback.*', admin.lookback.LookbackHandler)
]

admin_scripts = [
    (r'/api.*', admin.scripts.APIHandler, dict(db=db)),
    (r'/pixel.*',admin.scripts.PixelHandler, dict(db=db,api=api,bidder=bidder)),
    (r'/admin/targeting.*',admin.scripts.TargetingHandler, dict(redis=_redis,api=api,db=db)),
    (r'/bidder_profile.*',admin.scripts.ProfileHandler, dict(db=db,api=api,bidder=bidder)),
    (r'/advertiser.*',admin.scripts.AdvertiserHandler, dict(db=db,api=api)),
    (r'/money.*',admin.scripts.MoneyHandler, dict(db=db,api=api)),
    (r'/admin/batch_request[^s]*', admin.scripts.BatchRequestHandler, dict(db=db, api=api, hive=hive)),
    (r'/admin/batch_requests.*', admin.scripts.BatchRequestsHandler, dict(db=db, api=api, hive=hive))
]

streaming = [
    (r'/streaming', streaming.streaming.IndexHandler),
    (r'/websocket', streaming.streaming.StreamingHandler,
      dict(db=db,buffers={"track":track_buffer, "view":view_buffer},control_buffer=buffer_control)
    )
]

admin_reporting = [
    (r'/admin/streaming',admin.streaming.IndexHandler),
    (r'/admin/websocket', admin.streaming.AdminStreamingHandler,
      dict(db=db,buffers={"track":track_buffer, "view":view_buffer})
    ),
    (r'/admin/viewable.*',admin.reporting.ViewabilityHandler, dict(db=db,api=api,hive=hive)),
    #(r'/target_list.*',admin.reporting.TargetListHandler),
    (r'/intraweek.*',admin.scripts.IntraWeekHandler, dict(db=db)),
    (r'/adminreport/(.*?)/.*', AdminReportHandler),
    (r'/admin/reportinglog/(.*?)', ReportingLogHandler),
    (r'/admin/event_log',admin.scripts.EventLogHandler, dict(db=db,api=api)),
    (r'/admin/event_log/(.*?)',admin.scripts.EventLogHandler, dict(db=db,api=api))
]

reporting = [
    (r'/', user.LoginHandler, dict(db=db)),
    (r'/reporting.*',reporting.ReportingHandler, dict(db=db,api=api,hive=hive)),
    (r'/creative/reporting.*', reporting.CreativeReportingHandler, dict(db=db,api=api,hive=hive)),
    (r'/domain/reporting.*', reporting.DomainReportingHandler, dict(db=db,api=api,hive=hive)), 
    (r'/login.*', user.LoginHandler, dict(db=db)),
    (r'/signup*', user.SignupHandler, dict(db=db))
]

analysis = [
    (r'/analysis/pixel/', rbox_pixel.RockerboxPixelHandler, dict(db=db, api=api, hive=hive)),
    (r'/analysis/pixel/(.*)', rbox_pixel.PixelAdvertiserHandler, dict(db=db, api=api, hive=hive)),
    (r'/analysis*', analysis.AnalysisHandler, dict(db=db, api=api, hive=hive))
]

static = [
    (r'/static/(.*)', tornado.web.StaticFileHandler, {'path': "static"})
]

dirname = os.path.dirname(os.path.realpath(__file__))
app = tornado.web.Application(
    streaming + admin_scripts + admin_reporting + reporting + analysis + static + index,
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
