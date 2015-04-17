from auction import Auction
import logging
import requests
import grequests

class AuctionsRunner(object):

    from lib.report.utils.constants import FORM_HEADERS
    TIMEOUT = 45

    def __init__(self,bidforms):
        self.auctions = [Auction(form).form_and_url for form in bidforms]

    def bid_single(self,url,form):
        logging.info("running single auction: %s" % url)
        resp = requests.post(url, data=form, headers=self.FORM_HEADERS, timeout=self.TIMEOUT)
        return resp
     

    def bid_batch(self):
        logging.info("running auctions as batch...") 
        rs = (
            grequests.post(url, data=form, headers=self.FORM_HEADERS, timeout=self.TIMEOUT) 
                for form, url in self.auctions
        )
    
        gen = grequests.map(rs)
        return gen

    def bid_serial(self):
        logging.info("running auctions serially...")
        return [self.bid_single(url,form) for form,url in self.auctions]
    
    def run_auctions(self, serial=False):
        if len(self.auctions) > 1 and not serial:
            return self.bid_batch()
        else:
            return self.bid_serial()
    
     
