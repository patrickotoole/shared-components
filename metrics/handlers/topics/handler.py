import tornado.web
import ujson
import lib.custom_defer as custom_defer

from twisted.internet import defer
from lib.helpers import *
from handlers.base import BaseHandler
from database import *

class TopicsHandler(BaseHandler):

    def initialize(self,db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache= crushercache

    def get_topic(self,topic):
        data = get_topic_from_db(self.crushercache, topic)
        _resp= {}
        if len(data)==0:
            self.set_status(400)
            _resp = {"error":"No data for topic"}
        else:
            _resp = data.to_dict('records')
        return _resp

    @tornado.web.authenticated
    @decorators.error_handling
    def get(self):
        advertiser = self.current_advertiser_name
        topic = self.get_argument("topic",False)
        if not topic:
            _resp={"error":"No topic provided"}
            self.set_status(400)
        else:
            _resp= self.get_topic(topic)
        self.write(ujson.dumps(_resp))
        self.finish()
