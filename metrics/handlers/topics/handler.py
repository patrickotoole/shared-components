import tornado.web
import ujson
import lib.custom_defer as custom_defer

from twisted.internet import defer
from lib.helpers import *
from handlers.base import BaseHandler
from database import *

QUERYTOPICS = "select distinct topic from url_title"

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

    def list_topics(self):
        data = self.crushercache.select_dataframe(QUERYTOPICS)
        resp = {}
        resp['topics'] = []
        for topic in data.iterrows():
            resp['topics'].append(topic[1]['topic'])
        return resp

    @tornado.web.authenticated
    @decorators.error_handling
    def get(self,uri):
        advertiser = self.current_advertiser_name
        topic = self.get_argument("topic",False)
        _resp = {}
        if "list_topics" in uri:
            _resp = self.list_topics()
        else:
            if not topic:
                _resp={"error":"No topic provided"}
                self.set_status(400)
            else:
                _resp= self.get_topic(topic)
        self.write(ujson.dumps(_resp))
        self.finish()
