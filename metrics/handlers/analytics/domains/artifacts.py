import tornado.web
import pandas
import logging
from twisted.internet import defer
from lib.helpers import decorators, Render
import ujson
import lib.custom_defer as custom_defer
from ..search.pattern.base_visitors import VisitorBase

GET = "select json from artifacts where advertiser = '%s' and key_name='%s'"
POST = "insert into artifacts (advertiser, json, key_name) values ('%s', '%s', '%s')"
PUT = "update artifacts set json = '%s' where advertiser = '%s' and key_name = '%s'"
DELETE = "delete from artifacts where advertiser='%s' and key_name = '%s'"

class ArtifactsHandler(VisitorBase,Render):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache = crushercache

    @decorators.deferred
    def get_from_db(self, advertiser, artifact):
        json = self.crushercache.select_dataframe(GET % (advertiser, artifact))
        json_obj = ujson.loads(json['json'][0])
        result = {artifact:json_obj}
        return result

    @custom_defer.inlineCallbacksErrors
    def first_step(self, advertiser, artifact):
        data = yield self.get_from_db(advertiser, artifact)
        self.compress(ujson.dumps(data))

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        advertiser = self.current_advertiser_name
        artifact = self.get_argument("artifact", False)
        include_defaults = self.get_argument("defaults",False)
        self.first_step(advertiser, artifact)

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def post(self):
        self.write(ujson.dumps({}))

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def put(self):
        self.write(ujson.dumps({}))

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def delete(self):
        self.write(ujson.dumps({}))
