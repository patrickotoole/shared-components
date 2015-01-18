import requests
import logging
import sys
from options import define, options, parse_command_line

class BidderControl(object):

    def __init__(self,load_balancers=[], marathon_endpoint="", path_endpoint="/bidder_path", 
            state_endpoint="/state", ready_endpoint="/ready", use_link=True):

        self.load_balancers = load_balancers
        self.marathon_endpoint = marathon_endpoint

        self.path = path_endpoint
        self.state_url = state_endpoint
        self.ready_url = ready_endpoint

        if use_link:
            from link import lnk
            self.api = lnk.api.bidder

    @property
    def bidders(self):
        if hasattr(self,"_bidders") is False:
            bidders_json = requests.get(self.marathon_endpoint).json()
            hosts = self.parse_bidder_json(bidders_json)
            self._bidders = hosts
            logging.info("Pulled bidders from marathon: " + str(self._bidders))

        return self._bidders


    @classmethod
    def parse_bidder_json(cls, bidders_json):
        import socket
        hosts = {str(t['host']):socket.gethostbyname(t['host']) + ":9999" for t in bidders_json['app']['tasks']}
        return hosts


    @classmethod
    def parse_bidder_path(cls, rsp):
        split = rsp.split("\n") 
        bidder_address = ",".join([ i.split("Bidder on: ")[1] for i in split if "on" in i]) 
        return bidder_address


    def get_status(self):
        URL = "http://%s" + self.ready_url
        for node in self.load_balancers:
            rsp = requests.get(URL % node).content
            flag ="online" if rsp == "1\n" else "offline" 
            logging.info("%s is %s" % (node, flag))

    def get_bidder_routes(self):
        URL = "http://%s" + self.path
        for node in self.load_balancers:
            rsp = requests.get(URL % node).content
            bidder_on = self.parse_bidder_path(rsp)
            logging.info("%s routes to %s" % (node, bidder_on))
 
    def set_bidder_routes(self,path=""):
        URL = "http://%s" + self.path
        for node in self.load_balancers:
            rsp = requests.post(URL % node,path).content
            bidder_on = self.parse_bidder_path(rsp)
            logging.info("%s routes to %s" % (node, bidder_on))
     

    def set_state(self,state=True):
        URL = "http://%s" + self.state_url
        for node in self.load_balancers:
            content = "1" if state else ""
            rsp = requests.post(URL % node, content).content
            logging.info("%s set state to %s" % (node,len(content)))
         
def init_logging():
    requests_log = logging.getLogger("requests")
    requests_log.setLevel(logging.WARNING)

    LOG_FORMAT = "[%(levelname)1.1s %(asctime)s %(module)s:%(lineno)d] %(message)s"
    _format = logging.Formatter(LOG_FORMAT)

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    h1 = logging.StreamHandler(sys.__stderr__)
    h1.setFormatter(_format)
    logger.addHandler(h1)
     


    
if __name__ == "__main__":
    define('load_balancers', type=str, 
        default="listener-1:8888,listener-2:8888,listener-3:8888,listener-4:8888,listener-5:8888,listener-6:8888,listener-7:8888,listener-8:8888",
        help="load balancers to pull and push from",metavar="LB=1:PORT,LB-2:PORT,..."
    )
    define('marathon_endpoint', type=str,default="http://master2:8080/v2/apps/docker-bidder")

    define('path_endpoint',type=str,default="/bidder_path")
    define('state_endpoint',type=str,default="/state") 
    define('ready_endpoint',type=str,default="/ready")  

    define('show_state',type=bool,help="shows status of each load balancer")
    define('show_routes',type=bool, help="shows where each load balancer routes to")
    define('show_bidders',type=bool, help="shows the bidders that are active in marathon") 

    define('set_routes',type=bool, help="change the load_balancer -> bidder route")
    define('override_bidder',type=str, default="",help="bidder_path to use for load_balancer -> bidder",metavar="BIDDER:PORT")
    define('set_state',type=str,default="None",help="turns bidder on / off")

    parse_command_line()
    init_logging()

    controls = BidderControl(
        options.load_balancers.split(","),
        options.marathon_endpoint,
        options.path_endpoint,
        options.state_endpoint,
        options.ready_endpoint,
        True
    )


    if options.show_state:
        controls.get_status()

    if options.show_routes:
        controls.get_bidder_routes()
     
    if options.show_bidders:
        controls.bidders
 

    if options.set_state != "None":
        controls.set_state(options.set_state == "on")

    if options.set_routes:
        bidder = options.override_bidder if len(options.override_bidder) else controls.bidders.values()[0]

        controls.set_bidder_routes(bidder)
     
        
    
    
 

