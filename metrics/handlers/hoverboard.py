import pandas
import tornado.web
import ujson
import json
import numpy as np

from twisted.internet import defer
from lib.mysql.helpers import run_mysql_deferred 

from lib.helpers import *
from admin.reporting.advertiser.hoverboard_v2 import HoverboardHandlerV2 
from base import BaseHandler

class HoverboardHandler(HoverboardHandlerV2,BaseHandler):

    @defer.inlineCallbacks
    def set_advertiser_and_get(self,advertiser_id,meta):
        Q = "SELECT pixel_source_name from rockerbox.advertiser where external_advertiser_id = %s" % advertiser_id
        df = yield run_mysql_deferred(self.reporting_db,Q)
        self.request.arguments['advertiser'] = [df.values[0][0]]

        super(HoverboardHandler,self).get(meta)

        
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        if not self.get_argument("meta",False):
            self.request.arguments['meta'] = ['bubble_category']
            self.request.arguments['limit'] = ['10']

        if not formatted:
            self.render("hoverboard.html",data="")
        else:
            self.set_advertiser_and_get(self.current_advertiser,meta)

