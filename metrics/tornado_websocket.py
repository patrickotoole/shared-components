import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.httpserver
import redis
from handlers.creative import APIHandler
from handlers.streaming import WebSocketHandler
from handlers.scripts import AdvertiserHandler, ProfileHandler, MoneyHandler, PixelHandler, ReportingHandler
from handlers.hive import ViewabilityHandler, TargetListHandler 
from handlers.target import TargetingHandler

from lib.hive import Hive


from tornado.httpclient import AsyncHTTPClient
from reactor import BufferedSocketFactory
from reactor_2 import ViewabilityBufferedFactory 


import tornado.platform.twisted
tornado.platform.twisted.install()
from twisted.internet import reactor, protocol, defer, threads
from twisted.protocols import basic

from tornado.options import define, options, parse_command_line
from lib.link_sql_connector import DBCursorWrapper
from link import lnk

import signal
import requests
import logging
import time
import lookback
import os

requests_log = logging.getLogger("requests")
requests_log.setLevel(logging.WARNING)

MAX_WAIT_SECONDS_BEFORE_SHUTDOWN = 1

define("port", default=8080, help="run on the given port", type=int)

class IndexHandler(tornado.web.RequestHandler):
    @tornado.web.asynchronous
    def get(self):
        self.render("index.html")
    
class DebugHandler(tornado.web.RequestHandler):
    @tornado.web.asynchronous
    def get(self):
        self.render("debug.html")

class UIDHandler(tornado.web.RequestHandler):
    @tornado.web.asynchronous
    def get(self):
        http_client = AsyncHTTPClient()
        http_client.fetch(
            "http://ib.adnxs.com/cookie?dongle=pledgeclass&uid=9052761083883901898&member_id=2024",
            callback=self.on_fetch
        )

    def on_fetch(self, response):
        print response
        self.write("")
        self.finish()

def get_content(uid):
    content = os.popen("ssh root@107.170.16.15 'tail -n 2000000 /var/log/nginx/qs.log | grep %s'" % uid).read()
    content += os.popen("ssh root@107.170.2.67 'tail -n 2000000 /var/log/nginx/qs.log | grep %s'" % uid).read() 
    #content += os.popen("ssh root@107.170.31.214 'grep %s /root/qs.log'" % uid).read() 
    return content

def async_get_content(uid):
    d = threads.deferToThread(get_content,uid)
    return d
  

class LookbackHandler(tornado.web.RequestHandler):

    @defer.inlineCallbacks
    def get_content(self,uid):
        content = yield async_get_content(uid)
        lb = lookback.Lookback(uid,content)
        data = lb.get_all()
        self.write(data)
        self.finish()
        
    @tornado.web.asynchronous
    def get(self):
        is_json = 'json' in self.request.uri
        uid = self.get_argument("uid",False)
        if is_json and uid:
            self.get_content(uid)
        else:
            self.render("lookback.html")


def sig_handler(sig, frame):
    logging.warning('Caught signal: %s', sig)
    tornado.ioloop.IOLoop.instance().add_callback_from_signal(shutdown)
 
def shutdown():
    logging.info('Stopping http server')
    reactor.stop()
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
buffered_socket = reactor.listenTCP(1234,BufferedSocketFactory(socket_buffer))

view_buffer = []
view_socket = reactor.listenTCP(1235,ViewabilityBufferedFactory(view_buffer))

app = tornado.web.Application([
    (r'/streaming', IndexHandler),
    (r'/debug', DebugHandler), 
    (r'/lookback.*', LookbackHandler), 
    (r'/websocket', WebSocketHandler, dict(db=db,socket_buffer = socket_buffer, view_buffer = view_buffer)),
    (r'/uid.*',UIDHandler),
    (r'/api.*', APIHandler, dict(db=db)),
    (r'/bidder_profile.*',ProfileHandler, dict(db=db,api=api,bidder=bidder)),
    (r'/advertiser.*',AdvertiserHandler, dict(db=db,api=api)),
    (r'/money.*',MoneyHandler, dict(db=db,api=api)),
    (r'/viewable.*',ViewabilityHandler, dict(db=db,api=api,hive=hive)),
    (r'/pixel.*',MoneyHandler, dict(db=db,api=api)),
    (r'/targeting.*',TargetingHandler, dict(redis=_redis,api=api,db=db)),
    (r'/target_list.*',TargetListHandler),
    (r'/reporting.*',ReportingHandler, dict(db=db,api=api))

],debug=True,db=lnk.dbs.mysql)


if __name__ == '__main__':
    parse_command_line()

    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)

    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)

    tornado.ioloop.IOLoop.instance().start()
