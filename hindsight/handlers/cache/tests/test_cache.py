from tornado.testing import AsyncHTTPTestCase 
from tornado.web import  Application, RequestHandler 
import unittest
import mock
import ujson
from link import lnk 
import logging
import handlers.cache as cache
from zipped_value import *
import handlers.login as user

CREATE_CACHE_TABLE="""
CREATE TABLE `generic_function_cache` (
  `advertiser` varchar(255) DEFAULT NULL,
  `url_pattern` varchar(255) DEFAULT NULL,
  `action_id` int(11) DEFAULT NULL,
  `udf` varchar(255) DEFAULT NULL,
  `zipped` longblob,
  `currenttime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date` date DEFAULT NULL,
  UNIQUE KEY `advertiser` (`advertiser`,`url_pattern`,`action_id`,`udf`,`date`)
)
"""

CACHE_FIXTURE_1 = """
INSERT INTO generic_function_cache (`advertiser`,`url_pattern`,`action_id`, `udf`, `zipped`) 
VALUES ("mulberry","/",1,"domains_full_time_minute","%s")
"""


class CacheTest(AsyncHTTPTestCase):

    
    def setUp(self):        
        self.db = lnk.dbs.test
             
        
        len_check = self.db.execute("show tables like 'generic_function_cache'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE generic_function_cache")

        self.db.execute(CREATE_CACHE_TABLE)
        self.db.execute(CACHE_FIXTURE_1 % zipped)
        #self.db.execute(ADVERTISER_FIXTURE_1)
        self.cachedb = cache.CacheDatabase()
        self.cachedb.crushercache = self.db


    def tearDown(self):
        self.db.execute("DROP TABLE generic_function_cache")
        
    def test_now(self):        
        test_now = self.cachedb.now()
        self.assertTrue(len(test_now)>1)

    def test_get_from_db(self):
        test_resp = self.cachedb.get_from_db("domains_full_time_minute", "mulberry", "/", 1,"v1")
