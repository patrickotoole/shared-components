from tornado.testing import AsyncHTTPTestCase 
from tornado.web import  Application, RequestHandler 
import unittest
import pandas
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

CREATE_PATTERN_TABLE = """
CREATE TABLE `action_with_patterns` (
  `pixel_source_name` varchar(250) DEFAULT NULL,
  `action_id` int(11) NOT NULL,
  `url_pattern` varchar(3000) NOT NULL
)
"""

ACTION_FIXTURE_1 = """
INSERT INTO action_with_patterns (`action_id`,`pixel_source_name`, `url_pattern`) 
VALUES (1,"mulberry","/")
""" 

CACHE_FIXTURE_1 = """
INSERT INTO generic_function_cache (`advertiser`,`url_pattern`,`action_id`, `udf`, `zipped`, `date`) 
VALUES ("mulberry","/",1,"domains_full_time_minute","%s", "2017-01-01")
"""


class CacheTest(AsyncHTTPTestCase):

    
    def setUp(self):        
        self.db = lnk.dbs.test
             
        
        len_check = self.db.execute("show tables like 'generic_function_cache'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE generic_function_cache")
        len_check = self.db.execute("show tables like 'action_with_patterns'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE action_with_patterns")

        self.db.execute(CREATE_CACHE_TABLE)
        self.db.execute(CACHE_FIXTURE_1 % zipped)
        self.db.execute(CREATE_PATTERN_TABLE)
        self.db.execute(ACTION_FIXTURE_1)
        self.cachedb = cache.CacheDatabase()
        self.cachedb.crushercache = self.db
        self.cachedb.db = self.db
        self.cachedb.set_status = mock.Mock()


    def tearDown(self):
        self.db.execute("DROP TABLE generic_function_cache")
        
    def test_date(self):
        test_date=self.cachedb.get_recent_data("mulberry", "/", 1, "domains_full_time_minute")        
        self.assertTrue(test_date=="2017-01-01")

    def test_get_action_id(self):
        test_id = self.cachedb.get_action_id("mulberry", "/")
        self.assertTrue(test_id==1)

    def test_decode_data(self):
        test_resp = self.cachedb.decode_data(pandas.DataFrame([{"zipped":zipped}]))
        
        self.assertTrue('after' in ujson.loads(test_resp).keys())
