import tornado.web
import logging
import json
from webhook_helpers import *

class WebhookHandler(tornado.web.RequestHandler, WebhookDatabase, WebhookWorkqueue):

    def initialize(self,**kwargs):
        self.db = kwargs.get("db",False)
        self.crushercache = kwargs.get("crushercache",False) 

    def post(self,uri):
        data = json.loads(self.request.body)
        scriptname = self.get_script(uri)
        self.add_webhook_to_wq(scriptname, data)
        logging.info("Success, recieved message from webhook")

