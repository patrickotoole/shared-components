import datetime
import redis
import lib.buffers.stream as stream
import maxminddb
from twisted.internet import  protocol, defer, threads
from twisted.protocols import basic
from lib.helpers import URL
reader = maxminddb.Reader('/mnt/home/GeoLite2-City.mmdb')

parse_domain = URL.parse_domain

class BufferedSocket(basic.LineReceiver):
    def __init__(self,buf):
        self.buf = buf

    def get_user(self,fline):
        redis_result = int(redis_server.get(fline['uid']) == "test")
        redis_result_2 = int(redis_server_2.get(fline['uid']) == "test")
        fline['approved_user'] = redis_result or redis_result_2
        return fline

    def async_get_user(self,fline):
        # check if this starts with numbers
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
        ip_lookup = reader.get(fline.get('ip_address','0.0.0.0'))
        try:
            geo_location = {
                "city": ip_lookup.get('city',{}).get('names',{}).get('en',""), 
                "state": ip_lookup.get('subdivisions',[{}])[0].get('names',{}).get('en'),
                "city_state": ip_lookup.get('city',{}).get('names',{}).get('en',"") + ", " + ip_lookup.get('subdivisions',[{}])[0].get('names',{}).get('en'),
                "country": ip_lookup.get('country',{}).get('names',{}).get('en'),
                "latitude": ip_lookup.get('location',{}).get('latitude'),
                "longitude": ip_lookup.get('location',{}).get('longitude')
            }
        except:
            geo_location = {}

        
        args = (
            2261194,fline.get('uid','0'),fline.get('domain',''),
            2024,fline.get('width',300),fline.get('height',250),fline.get('ip_address','0.0.0.0'),
            fline.get('auction_id','0'),fline.get('campaign_id','0')
        )
        #print args
        if False:
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
        else:
            return dict(fline.items() + geo_location.items())
        

    def async_get_debug(self,fline):
        d = threads.deferToThread(self.get_debug,fline)
        d.addCallback(self.set_buffer)
        return d

    def set_buffer(self,fline):
        #print fline
        self.buf += [fline]

    def lineReceived(self, line):
        # has the following callback chain 
        # get_user -> get_debug -> set_buffer
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



socket_buffer = []
redis_server = redis.StrictRedis(host='162.243.123.240', port=6379, db=0)
redis_server_2 = redis.StrictRedis(host='108.60.150.34', port=6379, db=0)
 

