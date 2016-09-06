import tornado.web
import pandas
import logging
from twisted.internet import defer
from lib.helpers import decorators, Render
import ujson
import lib.custom_defer as custom_defer
from ..search.pattern.base_visitors import VisitorBase

GET = "select json from artifacts where advertiser = '%s' and key_name='%s'"
GETDEFAULT = "select json from artifacts where key_name='%s' and advertiser is null"
POST = "insert into artifacts (advertiser, key_name, json) values (%s,%s, %s)"
POSTDEFAULT = "insert into artifacts (key_name, json) values (%s, %s)"
PUT = "update artifacts set json = %s where advertiser = %s and key_name = %s"
DELETE = "update artifacts set deleted=1 where advertiser=%s and key_name = %s"

class ArtifactsHandler(VisitorBase):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache = crushercache

    @decorators.deferred
    def get_from_db(self, advertiser, artifact):
        if advertiser:
            json = self.crushercache.select_dataframe(GET % (advertiser, artifact))
        else:
            json = self.crushercache.select_dataframe(GETDEFAULT % (artifact))
        json_obj = ujson.loads(json['json'][0])
        result = {artifact:json_obj}
        return result

    @custom_defer.inlineCallbacksErrors
    def get_db(self, advertiser, artifact):
        data = yield self.get_from_db(advertiser, artifact)
        self.write(ujson.dumps(data))
        self.finish()

    @decorators.deferred
    def post_from_db(self, advertiser, artifact,default, json):
        if default == "true" or default == "True" or default == "TRUE":
            default_bool = True
        else:
            default_bool = False
        try:
            if default_bool:
                json = self.crushercache.execute(POST, (advertiser, artifact, json))
            else:
                json = self.crushercache.execute(POSTDEFAULT, (artifact, json))
            result = {"success":"True"}
        except:
            result = {"success":"False"}
        return result

    @custom_defer.inlineCallbacksErrors
    def post_db(self, advertiser, artifact, default, json):
        data = yield self.post_from_db(advertiser, artifact, default,json)
        if data['success']=="False":
            self.set_status(400)
        self.write(ujson.dumps(data))
        self.finish()


    @decorators.deferred
    def delete_from_db(self, advertiser, artifact):
        try:
            json = self.crushercache.execute(DELETE, (advertiser, artifact))
            result = {"success":"True"}
        except:
            result = {"success":"False"}
        return result

    @custom_defer.inlineCallbacksErrors
    def delete_db(self, advertiser, artifact):
        data = yield self.delete_from_db(advertiser, artifact)
        if data['success']=="False":
            self.set_status(400)
        self.write(ujson.dumps(data))
        self.finish()

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def get(self):
        import ipdb;ipdb.set_trace()
        advertiser = self.current_advertiser_name
        artifact = self.get_argument("artifact", False)
        include_defaults = self.get_argument("default",False)
        if include_defaults:
            advertiser = False
        self.get_db(advertiser, artifact)

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def post(self):
        data = ujson.loads(self.request.body)
        advertiser = self.current_advertiser_name
        artifact = data['artifact']['key_name']
        default = data['artifact']['default']
        json = data['artifact']['json']
        self.post_db(advertiser, artifact, default, json)

    @tornado.web.authenticated
    @tornado.web.asynchronous
    @decorators.error_handling
    def delete(self):
        advertiser = self.current_advertiser_name
        artifact = self.get_argument("artifact", False)
        self.delete_db(advertiser, artifact) 
