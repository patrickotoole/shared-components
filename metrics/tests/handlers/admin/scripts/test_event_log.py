import sys
import mock
import os
import ujson
sys.path.append("../../../../")

from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

import unittest
import metrics.handlers.admin.scripts.event_log as ev

CREATE_TABLE = """
create table data_integrity_log (id int primary key auto_increment, table_name varchar(50), agg_name varchar(100), partition varchar(100), row_count int, agg_count int, result boolean, deleted boolean default 0);
"""
FIXTURE1 = "insert into data_integrity_log (row_count, agg_count, result) values (1,1,1);"
FIXTURE2 = "insert into data_integrity_log (row_count, agg_count, result) values (2,1,0);" 

class LoginTest(AsyncHTTPTestCase):

    def get_app(self):
        self.maxDiff = 1024
        self.db = lnk.dbs.test

        self.db.execute(CREATE_TABLE)
        self.db.execute(FIXTURE1)
        self.db.execute(FIXTURE2)

        self.app = Application([
          ('/', ev.EventLogHandler, dict(db=self.db, api=None)),
          ('/(.*?)', ev.EventLogHandler, dict(db=self.db, api=None)) 
        ],
            cookie_secret="rickotoole"
        )
        return self.app

    def tearDown(self):
        self.db.execute("DROP TABLE data_integrity_log")
  
    def test_get_unfinished(self):
        expected = [
            {"agg_name":0,"partition":0,"row_count":2,"agg_count":1,"table_name":0,"result":0,"id":2,"deleted":0}
        ]
        response = ujson.loads(self.fetch("/?unfinished=true",method="GET").body)
        self.assertEqual(response,expected)

    def test_get_all(self):
        expected = [
            {"agg_name":0,"partition":0,"row_count":1,"agg_count":1,"table_name":0,"result":1,"id":1,"deleted":0},
            {"agg_name":0,"partition":0,"row_count":2,"agg_count":1,"table_name":0,"result":0,"id":2,"deleted":0}
        ]
        response = ujson.loads(self.fetch("/",method="GET").body)
        self.assertEqual(response,expected)
        
    def test_get_by_id(self):
        expected = [
            {"agg_name":0,"partition":0,"row_count":1,"agg_count":1,"table_name":0,"result":1,"id":1,"deleted":0}
        ]
        response = ujson.loads(self.fetch("/1",method="GET").body)
        self.assertEqual(response,expected)
     
    def test_post_fails(self):
        body = self.fetch("/",method="POST",body="{}").body
        self.assertEqual(body,"required_columns: table_name, agg_name, partition")

    def test_post_success(self):
        to_post = {'agg_name':'yo','partition':'this','table_name':'sucks'}
        to_post_json = ujson.dumps(to_post)

        expected = [{'agg_name':'yo','partition':'this','row_count':0,'agg_count':0,'table_name':'sucks','result':0,'id':3,"deleted":0}]
        body = ujson.loads(self.fetch("/",method="POST",body=to_post_json).body)
        self.assertEqual(body,expected)

    def test_put_fails(self):
        to_post = {'agg_name':'yo','partition':'this','table_name':'sucks'}
        to_post_json = ujson.dumps(to_post) 

        body = self.fetch("/",method="PUT",body=to_post_json).body
        self.assertEqual(body,"entry does not exist")

    def test_put_success(self):
        to_post = {'agg_name':'yo','partition':'this','table_name':'sucks'}
        to_post_json = ujson.dumps(to_post)
        expected = [{"agg_name":"yo","partition":"this","row_count":1,"agg_count":1,"table_name":"sucks","result":1,"id":1,"deleted":0}]

        body = ujson.loads(self.fetch("/1",method="PUT",body=to_post_json).body)

        self.assertEqual(body,expected)

    def test_delete(self):

        body = ujson.loads(self.fetch("/1",method="DELETE").body)

        self.assertEqual(body,True) 
