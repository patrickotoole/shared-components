import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.httpserver
from tornado.httpclient import AsyncHTTPClient

import datetime
import tornado.platform.twisted
tornado.platform.twisted.install()
from twisted.internet import reactor, protocol, defer, threads
from twisted.protocols import basic

from tornado.options import define, options, parse_command_line
from link import lnk
from functools import partial

import signal
import stream
import requests
import generator_subscription as sub
import debug_parse, asi_parse
import ujson
import pandas
import redis
import logging
import time
import lookback
import os

requests_log = logging.getLogger("requests")
requests_log.setLevel(logging.WARNING)

MAX_WAIT_SECONDS_BEFORE_SHUTDOWN = 1

define("port", default=8080, help="run on the given port", type=int)

# we gonna store clients in dictionary..
clients = dict()
subscription = dict()


def write(client_id):
    def send(message):
        WebSocketHandler.send_to_websocket(client_id,message)
    return send


class CreativeHandler(tornado.web.RequestHandler):
    def get(self):
        crid = self.get_argument("id",False)
        ty = self.get_argument("type",False)
        if crid:
            db = lnk.dbs.mysql
            q = db.select_dataframe("select * from appnexus_reporting.advertiser where id = %s" % crid)
            q.to_html()
            #v = q.fillna(0).T.to_dict().values()

            #json = ujson.dumps(v).decode('ascii','ignore')
            self.render("creative.html")


    def post(self):
        print self.request.body
        self.write("hello")



class IndexHandler(tornado.web.RequestHandler):
    @tornado.web.asynchronous
    def get(self):
        self.render("index.html")

    def post(self):
        print self.request.body
        self.write("hello")

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


    def post(self):
        print self.request.body
        pass



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


def parse_domain(referrer):
    try:
        if referrer[:len(referrer)/2]*2 == referrer:
            referrer = referrer[:len(referrer)/2]
        t = referrer.split("//")
    except:
        t = [""]

    if len(t) > 1:
        t = [t[1]]

    d = t[0].split("/")[0].split("?")[0].split("&")[0].split(" ")[0].split(".")

    if len(d) < 3:
        domain = ".".join(d)
    elif len(d[-2]) < 4:
        domain = ".".join(d[-3:])
    else:
        domain = ".".join(d[-2:])
    
    return domain.lower()

def mask_from_dict(df,masks):
    mask = df.index == df.index
    for column,values in masks.iteritems():
        mask = mask & df[column].isin(values)
        
    return mask

class BufferedSocket(basic.LineReceiver):
    def __init__(self,buf):
        self.buf = buf

    def get_user(self,fline):
        fline['approved_user'] = int(redis_server.get(fline['uid']) == 'test')
        return fline

    def async_get_user(self,fline):
        d = threads.deferToThread(self.get_user,fline)
        return d

    def get_debug(self,fline):
        """
        args = (
            fline.get('tag','0'),fline.get('uid','0'),fline.get('domain',''),
            fline['seller'],300,250,fline.get('ip_address','0.0.0.0'),
            fline['auction_id']
        )
        """
        args = (
            2261194,fline.get('uid','0'),fline.get('domain',''),
            2024,fline.get('width',300),fline.get('height',250),fline.get('ip_address','0.0.0.0'),
            fline.get('auction_id','0')
        )
        try:
            #print args
            #asi = asi_parse.ASI(*args)
            #asi.post()
            #print asi.result
            debug = debug_parse.Debug(*args)
            debug.post()
            #print debug.result
            series = pandas.Series(
                dict(debug.auction_result)).append(
                debug.bid_density()).append(
                pandas.Series({"auction_id":str(debug.original_auction)})
            )

            return dict(fline.items() + series.to_dict().items())
        except:
            return fline

    def async_get_debug(self,fline):
        d = threads.deferToThread(self.get_debug,fline)
        d.addCallback(self.set_buffer)
        return d

    def set_buffer(self,fline):
        self.buf += [fline]

    def lineReceived(self, line):
        sline = line.split(" ")
        aline = stream.AuctionLine(sline)
        fline = aline.get_qs()

        if fline.get("referrer",False):
            fline['domain'] = parse_domain(fline['referrer'])

        if fline.get('uid',False):
            d = self.async_get_user(fline)
            d.addCallback(self.async_get_debug)
        else:
            self.async_get_debug(fline)


class BufferedSocketFactory(protocol.Factory):
    def __init__(self,buf):
        self.buf = buf

    def buildProtocol(self, addr):
        return BufferedSocket(self.buf)

    def set_buffer(self,buf):
        self.buf = buf

redis_server = redis.StrictRedis(host='162.243.123.240', port=6379, db=0)
socket_buffer = []
buffered_socket = reactor.listenTCP(1234,BufferedSocketFactory(socket_buffer))

BRAND_QUERY = "select id, advertiser_id, brand_id from creative"

RESULT = ["domain","uid","seller","tag","uid","approved_user","creative","advertiser_id","price"]
DEBUG = ["second_price", "count", "50%", "$mod", "gross_bid", "biased_bid", "min", "max", "%mod2", "winning_bid", "win_price", "25%", "std", "total", "soft_floor", "75%", "$mod2", "mean", "%mod", "gross_win_price", "second_price_calc"]
INFO = ["brand_id", "result", "pub", "ecp", "ip_address", "referrer", "venue", "debug"]


class WebSocketHandler(tornado.websocket.WebSocketHandler):
  
    def initialize(self):

        self.time_interval = 1
        self.do = lnk.dbs.digital_ocean
        self.creatives = self.do.select_dataframe(BRAND_QUERY)
        self.creatives['id'] = self.creatives.id.map(str)

    def build_data(self,value):
        df = pandas.DataFrame(value)
        df = df.merge(
            self.creatives,how="left",left_on="creative",right_on="id"
        ).set_index("auction_id")

        df = df.fillna(0)
        debug_columns = [i for i in DEBUG if i in df.columns]
        result_columns = [i for i in RESULT if i in df.columns]
        info_columns = [i for i in INFO if i in df.columns]

        df['debug'] = pandas.Series( df[debug_columns].T.to_dict())
        df['result'] = pandas.Series( df[result_columns].T.to_dict())
        df['info'] = pandas.Series( df[info_columns].T.to_dict())

        return df

    def mask_data(self,df,masks):
        if masks:
            return df[mask_from_dict(df,masks)]
        else:
            return df

                
    def generator_loop(self):
        import copy, time

        value = copy.deepcopy(socket_buffer)
        socket_buffer[:] = []
        start = time.time()
        if value:
            df = self.build_data(value)
                        
            for i,client in clients.iteritems():
                if client['enabled'] == False:
                    continue
                
                masks = client.get('masks',False)

                masked = self.mask_data(df,masks)
                _df = masked[['debug','info','result']]

                m = _df.fillna(0).T.to_dict().values()
                json = ujson.dumps(m).decode('ascii','ignore')
                try:
                    client['object'].write_message( json )
                except:
                    client['object'].on_close()
                

        end = time.time()

        if len(clients.keys()) > 0:
            tornado.ioloop.IOLoop.instance().add_timeout(
                datetime.timedelta(seconds=self.time_interval - (end - start)),
                self.generator_loop
            )

    def open(self, *args):
        self.id = self.get_argument("id")
        clients[self.id] = {"id": self.id, "object": self, "enabled":False}
        if len(clients.keys()) == 1:
            socket_buffer[:] = []
            self.generator_loop()

    def on_message(self, message):        
        try:
            masks = ujson.loads(message)
            clients[self.id]['masks'] = masks
        except:
            pass

        if message == "start":
            clients[self.id]['enabled'] = True

        print "Client %s received a message : %s" % (self.id, message)
        
    def on_close(self):
        if self.id in clients:
            del clients[self.id]

    def on_connection_close(self):
        if self.id in clients:
            del clients[self.id]

        self.connection_closed = True

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

app = tornado.web.Application([
    (r'/streaming', IndexHandler),
    (r'/asi', IndexHandler),

    (r'/debug', DebugHandler), 
    (r'/lookback.*', LookbackHandler), 
    (r'/websocket', WebSocketHandler),
    (r'/uid.*',UIDHandler),
    (r'/creative.*', CreativeHandler)
],debug=True)

if __name__ == '__main__':
    parse_command_line()

    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)

    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)

    tornado.ioloop.IOLoop.instance().start()
