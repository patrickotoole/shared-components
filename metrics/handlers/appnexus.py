import tornado.web
import ujson
import pandas
import StringIO
import mock
import time
import logging

from base import BaseHandler
from twisted.internet import defer
from lib.helpers import *  

services = {
    "country":"countries",
    "city":"cities"
}


class AppnexusHandler(BaseHandler):

    def initialize(self, db=None, api=None, **kwargs):
        self.db = db 
        self.api = api

    @decorators.deferred
    def get_readonly(self):

        split = self.request.uri.split("/")
        service = split[2].split("?")[0]

        URL = "/".join(split[2:])
        try:
            return self.api.get_all_pages("/" + URL, services.get(service,service + "s"))
        except:
            return self.api.get("/" + URL).json['response'][services.get(service,service + "s")]
 
        
    @defer.inlineCallbacks  
    def pull_readonly(self):
        read_only = yield self.get_readonly()

        self.write(ujson.dumps(read_only))
        self.finish()
        
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):

        self.pull_readonly()

