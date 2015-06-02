import sys
import lib.helpers
import os
import ujson
import importlib
import mock
sys.path.append("../../../../")

from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

import unittest
import metrics.handlers.analytics as handler

class DomainsMongoTest(AsyncHTTPTestCase):

    def get_app(self):
        self.mongo = lnk.dbs.mongo_test
        self.mongo.rockerbox.domains.create_index("domain", unique=True)
        self.mongo.rockerbox.domains.insert_one({"domain": None})
        self.mongo.rockerbox.domains.insert_one({"domain": "rockerbox.com"})
        self.mongo.rockerbox.domains.insert_one({"domain": "appnexus.com"})
        self.mongo.rockerbox.domains.insert_one({"domain": "mongodb.org"})

        self.app = Application([
          ('/', handler.DomainsMongoHandler, dict(mongo=self.mongo)),
          ('/(.*?)', handler.DomainsMongoHandler, dict(mongo=self.mongo))
        ],
            cookie_secret="rickotoole"
        )
        return self.app

    def tearDown(self):
        self.mongo.rockerbox.domains.remove()

    def test_get_all(self):
        data  = self.fetch("/?format=json", method="GET").body
        expected = ujson.dumps([
            {"domain":0}, 
            {"domain":"rockerbox.com"}, 
            {"domain": "appnexus.com"},
            {"domain": "mongodb.org"}
        ])
        
        self.assertEqual(data,expected)

    def test_get_one(self):
        data = self.fetch("/?format=json&domain=rockerbox.com", method="GET").body
        expected = ujson.dumps([{"domain": "rockerbox.com"}])

        self.assertEqual(data, expected)

    def test_insert(self):
        to_insert = {"domain": "google.com"}
        r = self.fetch("/", method="POST", body=ujson.dumps(to_insert))
        r_obj= ujson.loads(r.body)

        self.assertTrue("response" in r_obj)
        self.assertTrue("inserted_id" in r_obj["response"])

    def test_update(self):
        updates = {"category": "Advertising"}
        r = self.fetch("/?domain=rockerbox.com", method="PUT", body=ujson.dumps(updates))
        r_obj = ujson.loads(r.body)

        self.assertTrue("response" in r_obj)
        self.assertTrue("num_modified" in r_obj["response"])
        self.assertEqual(r_obj["response"]["num_modified"], "1")

        data = self.fetch("/?domain=rockerbox.com&format=json", method="GET").body
        expected = ujson.dumps([{"domain": "rockerbox.com", "category": "Advertising"}])
        self.assertEqual(data, expected)
