import tornado.web
import ujson
import pandas
import StringIO
import logging
import time

import pandas as pd

from ..base import BaseHandler
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

class DomainsMongoHandler(BaseHandler):
    def initialize(self, mongo=None, **kwargs):
        self.mongo = mongo

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            self.write(data)
        yield default, (data,)

    def write_response(self, response):
        self.write(response)
        self.finish()

    @defer.inlineCallbacks
    def get_domains(self, domain):
        df = yield self.defer_get_domains(domain)
        self.get_content(df)

    @defer.inlineCallbacks
    def insert_domain(self, data):
        try:
            result = yield self.defer_insert_domain(data)
            response = {"response": {"inserted_id": str(result.inserted_id)}}
            self.write_response(ujson.dumps(response))
        except Exception as e:
            self.write_response(ujson.dumps({"error": str(e)}))

    @defer.inlineCallbacks
    def delete_domain(self, domain):
        try:
            result = yield self.defer_delete_domain(domain)
            response = {"response": {"num_deleted": str(result.deleted_count)}}
            self.write_response(ujson.dumps(response))
        except Exception as e:
            self.write_response(ujson.dumps({"error": str(e)}))

    @defer.inlineCallbacks
    def update_domain(self, domain, updates):
        try:
            result = yield self.defer_update_domain(domain, updates)
            response = {"response": {"num_modified": str(result.modified_count)}}
            self.write_response(ujson.dumps(response))
        except Exception as e:
            self.write_response(ujson.dumps({"error": str(e)}))

    @decorators.deferred
    def defer_get_domains(self, domain):
        excludes = {'_id': False}
        
        if domain:
            includes = {"domain": domain}
        else:
            includes = {}
            
        df = pd.DataFrame(list(self.mongo.rockerbox.domains.find(includes, excludes)))
        return df

    @decorators.deferred
    def defer_insert_domain(self, data):
        response = self.mongo.rockerbox.domains.insert_one(ujson.loads(data))
        return response

    @decorators.deferred
    def defer_delete_domain(self, domain):
        response = self.mongo.rockerbox.domains.delete_one({"domain": domain})
        return response

    @decorators.deferred
    def defer_update_domain(self, domain, updates):
        # Updates should be a dictionary
        response = self.mongo.rockerbox.domains.update_one({"domain":domain},{"$set": updates})
        return response

    @tornado.web.asynchronous
    def get(self):
        formatted = self.get_argument("format", False)
        domain = self.get_argument("domain", False)

        if formatted:
            self.get_domains(domain)
        else:
            self.get_content(pandas.DataFrame())

    @tornado.web.asynchronous
    def post(self):
        self.insert_domain(self.request.body)

    @tornado.web.asynchronous
    def delete(self):
        domain = self.get_argument("domain")
        self.delete_domain(domain)

    @tornado.web.asynchronous
    def put(self):
        domain = self.get_argument("domain")
        self.update_domain(domain, ujson.loads(self.request.body))


