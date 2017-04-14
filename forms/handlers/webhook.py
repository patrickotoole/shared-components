import tornado.web
import logging
import json
from webhook_helpers import *
from lib.helpers import decorators
import lib.custom_defer as custom_defer

class WebhookHandler(tornado.web.RequestHandler, WebhookDatabase, WebhookWorkqueue):

    def initialize(self,**kwargs):
        self.db = kwargs.get("db",False)
        self.crushercache = kwargs.get("crushercache",False) 

    @custom_defer.inlineCallbacksErrors
    def get_and_add(self,uri,data):
        scriptname = yield self.get_script(uri)
        success = yield self.add_webhook_to_wq(scriptname, data)
        logging.info("Success, recieved message from webhook")

    @decorators.error_handling
    def post(self,uri):
        data = json.loads(self.request.body)
        self.get_and_add(uri, data)

