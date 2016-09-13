import tornado.web
import pandas
import logging
from twisted.internet import defer
from lib.helpers import decorators, Render
import ujson
import lib.custom_defer as custom_defer
from ..base import BaseHandler
from database import ArtifactsDatabase 

class ArtifactsHandler(BaseHandler):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache = crushercache
        self.database_instance = ArtifactsDatabase({'db':db, 'crushercache':crushercache})

    @tornado.web.authenticated
    @decorators.error_handling
    def get(self):
        advertiser = self.current_advertiser_name
        artifact = self.get_argument("artifact", False)
        use_default = self.get_argument("default",False)
        if use_default:
            advertiser = False 
        data_from_db = self.database_instance.get_from_db(advertiser, artifact)
        self.write(ujson.dumps(data_from_db))
        self.finish()

    @tornado.web.authenticated
    @decorators.error_handling
    def post(self):
        data = ujson.loads(self.request.body)
        advertiser = self.current_advertiser_name
        artifact = data['artifact']['key_name']
        json = data['artifact']['json']
        data_from_db = self.database_instance.post_to_db(advertiser, artifact, json)
        if "error" in data_from_db.keys():
            self.set_status(403)
        self.write(ujson.dumps(data_from_db))
        self.finish()

    @tornado.web.authenticated
    @decorators.error_handling
    def delete(self):
        advertiser = self.current_advertiser_name
        artifact = self.get_argument("artifact", False)
        data_from_db = self.database_instance.delete_from_db(advertiser, artifact) 
        self.write(ujson.dumps(data_from_db))
        self.finish()
