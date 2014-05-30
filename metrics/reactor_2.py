import datetime
from twisted.internet import  protocol, defer, threads
from twisted.protocols import basic

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

class ViewBufferedSocket(basic.LineReceiver):
    def __init__(self,buf):
        self.timers = []
        self.buf = buf
        self.track = {}

    def initiate(self,params):
        auction_id = params.get("auction_id",False)
        if auction_id:
            self.timers += [[int(datetime.datetime.now().strftime("%s")),auction_id]]
            self.track[auction_id] = params
        return params 

    def async_initiate(self,params):
        d = threads.deferToThread(self.initiate,params)
        return d

    def set_buffer(self,passed):
        self.buf += passed

    def is_viewable(self,params):
        if self.track.get(params["auction_id"],False):
            if params["visible"] == "true":
            	self.set_buffer(params)
            	del self.track[params["auction_id"]]

    def check_expired(self):
        now = int(datetime.datetime.now().strftime("%s"))
        ids = [auction_id for time,auction_id in self.timers if time < (now - 10) and self.track.get(auction_id,False)]
        for i in ids:
            try:
                del self.track[i]
            except:
                print(len(self.track))
                pass
        self.timers = self.timers[len(ids):]

    def async_check(self,params):
        self.check_expired()
        self.is_viewable(params)
        
            
    def lineReceived(self, line):
        columns = ["auction_id", "uid", 
            "seller", "tag", "pub", "venue", "ecp", 
            "price", "creative", "visible", "elapsed", 
            "action", "ref", "parent"
        ]
        sline = line.split(" ")
        params = dict(zip(columns,sline))

        if params.get("ref",False):
            params['ref'] = parse_domain(params['ref'])

            d = self.async_initiate(params)
            d.addCallback(self.async_check)


class ViewabilityBufferedFactory(protocol.Factory):
    def __init__(self,buf):
        self.buf = buf

    def buildProtocol(self, addr):
        return ViewBufferedSocket(self.buf)

    def set_buffer(self,buf):
        self.buf = buf
