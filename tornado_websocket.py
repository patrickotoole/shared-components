import tornado.ioloop
import tornado.web
import tornado.websocket
import datetime
import tornado.platform.twisted
tornado.platform.twisted.install()
from twisted.internet import reactor, protocol
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

define("port", default=9999, help="run on the given port", type=int)

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

class BufferedSocket(basic.LineReceiver):
    def __init__(self,buf):
        self.buf = buf

    def lineReceived(self, line):
        sline = line.split(" ")
        aline = stream.AuctionLine(sline)
        fline = aline.get_qs()
        self.buf += [fline]

class BufferedSocketFactory(protocol.Factory):
    def __init__(self,buf):
        self.buf = buf

    def buildProtocol(self, addr):
        return BufferedSocket(self.buf)

    def set_buffer(self,buf):
        self.buf = buf

BRAND_QUERY = "select id, advertiser_id, brand_id from creative"
socket_buffer = []
buffered_socket = reactor.listenTCP(1234,BufferedSocketFactory(socket_buffer))
import debug_multiprocess as dmp
multi = dmp.DebugMultiprocess()

class WebSocketHandler(tornado.websocket.WebSocketHandler):
  
    def initialize(self):

        self.time_interval = 5
        #self.timed = stream.genr_time_batch('/var/log/nginx/metric.log',self.time_interval)
        self.do = lnk.dbs.digital_ocean
        self.creatives = self.do.select_dataframe(BRAND_QUERY)
        self.creatives['id'] = self.creatives.id.map(str)
        self.redis = redis.StrictRedis(host='162.243.121.234', port=6379, db=0)
        
        

    def generator_loop(self):
        import copy, time
        #value = self.timed.next()
        value = copy.deepcopy(socket_buffer)
        socket_buffer[:] = []
        start = time.time()
        if value:
            
            for v in value:
                try:
                    v['domain'] = parse_domain(v['referrer'])
                except:
                    pass
                if v.get('uid',False):
                    v['approved_user'] = int(self.redis.get(v['uid']) == 'test')

            to_remove = [] 
            for i,client in clients.iteritems():
                print len(value)     
                df = pandas.DataFrame(value)
                rows = [
                    (row['tag'],row['uid'],row['domain'],row['seller'],300,250,row['ip_address'],row['auction_id']) 
                        for index,row in df.fillna('0').iterrows()
                ]
                auction_debugs = pandas.DataFrame(multi.run_pool(rows))
                """
                debug = debug_parse.Debug(
                    row['tag'],row['uid'],row['domain'],row['seller'],300,250,row['ip_address']
                )
                debug.post()
                print dict(debug.auction_result)
                print debug.bid_density()
                """
                df = df.merge(self.creatives,how="left",left_on="creative",right_on="id")
                df = df.merge(auction_debugs,how="left",left_on="auction_id",right_on="auction_id")
                masks = client.get('masks',False)
                if masks:
                    df = df[mask_from_dict(df,masks)]
                
                try:
                    del df['referrer']
                except:
                    pass
                m = df.fillna(0).T.to_dict().values()
                try:
                    client['object'].write_message( ujson.dumps(m).decode('ascii','ignore') )
                except:
                    to_remove += [client['id']]
                
            for client in to_remove:
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
        print clients
        print len(clients.keys())
        if len(clients.keys()) == 1:
            print "runned"
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
