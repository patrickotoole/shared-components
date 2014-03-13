import tornado.ioloop
import tornado.web
import tornado.websocket
import datetime
import tornado.platform.twisted
tornado.platform.twisted.install()
from twisted.internet import reactor, protocol, defer, threads
from twisted.protocols import basic

from tornado.options import define, options, parse_command_line
from link import lnk
from functools import partial

import stream
import requests
import generator_subscription as sub
import debug_parse
import ujson
import pandas
import redis

define("port", default=80, help="run on the given port", type=int)

# we gonna store clients in dictionary..
clients = dict()
subscription = dict()


def write(client_id):
    def send(message):
        WebSocketHandler.send_to_websocket(client_id,message)
    return send

class IndexHandler(tornado.web.RequestHandler):
    @tornado.web.asynchronous
    def get(self):
        self.render("index.html")


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
import debug_parse

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
        args = (
            fline.get('tag','0'),fline['uid'],fline.get('domain',''),
            fline['seller'],300,250,fline['ip_address'],
            fline['auction_id']
        )
        try:
            debug = debug_parse.Debug(*args)
            debug.post()
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


    #@defer.inlineCallbacks
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

redis_server = redis.StrictRedis(host='162.243.121.234', port=6379, db=0)

BRAND_QUERY = "select id, advertiser_id, brand_id from creative"
socket_buffer = []
buffered_socket = reactor.listenTCP(1234,BufferedSocketFactory(socket_buffer))

import debug_multiprocess as dmp
multi = dmp.DebugMultiprocess()



class WebSocketHandler(tornado.websocket.WebSocketHandler):
  
    def initialize(self):

        self.time_interval = 5
        self.do = lnk.dbs.digital_ocean
        self.creatives = self.do.select_dataframe(BRAND_QUERY)
        self.creatives['id'] = self.creatives.id.map(str)
                
    def generator_loop(self):
        import copy, time
        #value = self.timed.next()
        value = copy.deepcopy(socket_buffer)
        socket_buffer[:] = []
        start = time.time()
        if value:
            to_remove = [] 

            df = pandas.DataFrame(value)
            #rows = [
            #    (row['tag'],row['uid'],row['domain'],row['seller'],300,250,row['ip_address'],row['auction_id']) 
            #        for index,row in df.fillna('0').iterrows()
            #]
            #auction_debugs = pandas.DataFrame(multi.run_pool(rows)).fillna(0)
            #auction_series = pandas.Series(auction_debugs.set_index("auction_id").T.to_dict())
            #auction_series = auction_series[~pandas.Series(auction_series.index,index=auction_series.index).isnull()]

            df = df.merge(self.creatives,how="left",left_on="creative",right_on="id").set_index("auction_id")

            result_columns = ["domain","uid","seller","tag","uid","approved_user","creative","advertiser_id","price"]
            debug_columns = ["second_price", "count", "50%", "$mod", "gross_bid", "biased_bid", "min", "max", "%mod2", "winning_bid", "win_price", "25%", "std", "total", "soft_floor", "75%", "$mod2", "mean", "%mod", "gross_win_price", "second_price_calc"]
            info_columns = ["brand_id", "result", "pub", "ecp", "ip_address", "referrer", "venue", "debug"]

            #df['debug'] = auction_series
            
            
            df = df.fillna(0)
            df['debug'] = pandas.Series(
                df[debug_columns].T.to_dict()
            )
            df['result'] = pandas.Series(
                df[result_columns].T.to_dict()
            )
            df['info'] = pandas.Series(
                df[info_columns].T.to_dict()
            )
            

            print len(df)
            for i,client in clients.iteritems():
                masks = client.get('masks',False)
                if masks:
                    df = df[mask_from_dict(df,masks)]
                
                try:
                    del df['referrer']
                except:
                    pass

                df = df[['debug','info','result']]
                m = df.fillna(0).T.to_dict().values()
                json = ujson.dumps(m).decode('ascii','ignore')
                try:
                    client['object'].write_message( json )
                except:
                    to_remove += [client['id']]
                
            for client in to_remove:
                print "remove: %s" % client
                del clients[client]

        end = time.time()

        # we could stop this loop if we dont have any clients
        # just need a way of restarting it on register
        if len(clients.keys()) > 0:
            tornado.ioloop.IOLoop.instance().add_timeout(
                datetime.timedelta(seconds=self.time_interval - (end - start)),
                self.generator_loop
            )
        #tornado.ioloop.IOLoop.instance().add_callback(self.generator_loop)

    def open(self, *args):
        self.id = self.get_argument("id")
        clients[self.id] = {"id": self.id, "object": self}
        if len(clients.keys()) == 1:
            socket_buffer[:] = []
            self.generator_loop()

    def on_message(self, message):        
        """
        when we receive some message we want some message handler..
        for this example i will just print message to console
        """
        try:
            masks = ujson.loads(message)
            clients[self.id]['masks'] = masks
        except:
            pass
        print "Client %s received a message : %s" % (self.id, message)
        
    def on_close(self):
        if self.id in clients:
            del clients[self.id]

    def on_connection_close(self):
    # The client has given up and gone home.
        self.connection_closed = True

app = tornado.web.Application([
    (r'/', IndexHandler),
    (r'/websocket', WebSocketHandler),
],debug=True)

if __name__ == '__main__':
    parse_command_line()
    app.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()
    reactor.listenTCP(1234,TestFactory())
