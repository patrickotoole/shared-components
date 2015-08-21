import mock
import os
import ujson

from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from link import lnk

import handlers.funnel.funnel as funnel

CREATE_FUNNEL_ACTION_TABLE = """
CREATE TABLE `funnel_actions` (
  `funnel_id` int(11) NOT NULL AUTO_INCREMENT,
  `action_id` int(11) NOT NULL DEFAULT '0',
  `order` int(11) DEFAULT NULL,
  PRIMARY KEY (`funnel_id`,`action_id`)
)
"""

CREATE_FUNNEL_TABLE = """
CREATE TABLE `funnel` (
  `funnel_id` int(11) NOT NULL AUTO_INCREMENT,
  `funnel_name` varchar(100) DEFAULT NULL,
  `operator` enum('and','or') DEFAULT NULL,
  `owner` varchar(100) DEFAULT NULL,
  `pixel_source_name` varchar(250) DEFAULT NULL,
  `segment_id` int(11),
  PRIMARY KEY (`funnel_id`)
)
"""
CREATE_ADVERTISER_TABLE = """
CREATE TABLE `advertiser` (
  external_advertiser_id int(11),
  pixel_source_name varchar(100)
)
"""

FUNNEL_FIXTURE_1 = """
INSERT INTO funnel (funnel_id,funnel_name,operator,pixel_source_name,owner) 
VALUES (1,"landing+earings","and","baublebar","waikiki")
"""

FUNNEL_ACTION_FIXTURE_1 = """
INSERT INTO funnel_actions (funnel_id,action_id,`order`) 
VALUES (1,1,1)
"""

FUNNEL_ACTION_FIXTURE_2 = """
INSERT INTO funnel_actions (funnel_id,action_id,`order`) 
VALUES (1,2,2)
"""
 

FUNNEL_FIXTURE_2 = """
INSERT INTO funnel (funnel_id,funnel_name,operator,pixel_source_name,owner) 
VALUES (2,"other","and","baublebar","makiki") 
"""

CREATE_ACTION_TABLE = """
CREATE TABLE `action` (
  `action_id` int(11) NOT NULL AUTO_INCREMENT,
  `start_date` varchar(8) NOT NULL,
  `end_date` varchar(8) NOT NULL,
  `operator` enum('and','or') NOT NULL,
  `pixel_source_name` varchar(250) DEFAULT NULL,
  `action_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`action_id`)
)
"""

CREATE_PATTERN_TABLE = """
CREATE TABLE `action_patterns` (
  `action_id` int(11) NOT NULL,
  `url_pattern` varchar(3000) NOT NULL
)
"""

ACTION_FIXTURE_1 = """
INSERT INTO action (`action_id`,`start_date`,`end_date`, `operator`, `pixel_source_name`, `action_name`) 
VALUES (1,0,0,"and","baublebar","alans_action")
"""

ACTION_FIXTURE_2 = """
INSERT INTO action (`action_id`,`start_date`,`end_date`, `operator`, `pixel_source_name`, `action_name`) 
VALUES (2,0,0,"and","baublebar","wills_action") 
"""

ACTION_PATTERN_FIXTURE_2 = """
INSERT INTO action_patterns (`action_id`,url_pattern) 
VALUES (2,"wills_pattern") 
"""
ACTION_PATTERN_FIXTURE_21 = """
INSERT INTO action_patterns (`action_id`,url_pattern) 
VALUES (2,"wills_pattern_again") 
"""

ACTION_PATTERN_FIXTURE_1 = """
INSERT INTO action_patterns (`action_id`,url_pattern) 
VALUES (1,"alans_pattern") 
"""

ACTION_PATTERN_FIXTURE_11 = """
INSERT INTO action_patterns (`action_id`,url_pattern) 
VALUES (1,"alans_pattern2") 
"""
 
POST_FIXTURE = """{"owner":"waikiki","advertiser":"baublebar","funnel_name":"landing+earings","actions":[{"url_pattern":["wills_pattern","wills_pattern_again"],"action_name":"wills_action","action_id":2},{"url_pattern":["alans_pattern","alans_pattern2"],"action_name":"alans_action","action_id":1}]}"""
 
ADVERTISER_FIXTURE = "INSERT INTO advertiser (external_advertiser_id,pixel_source_name) values (1,'baublebar')"
 
class FunnelTest(AsyncHTTPTestCase):

    def get_app(self):
        self.db = lnk.dbs.test
        self.db.execute("DROP TABLE IF EXISTS funnel")
        self.db.execute("DROP TABLE IF EXISTS funnel_actions")
        
        self.db.execute("DROP TABLE IF EXISTS action")
        self.db.execute("DROP TABLE IF EXISTS action_patterns") 
        self.db.execute("DROP TABLE IF EXISTS advertiser") 

        self.db.execute(CREATE_FUNNEL_ACTION_TABLE) 
        self.db.execute(CREATE_FUNNEL_TABLE)  

        self.db.execute(CREATE_ACTION_TABLE) 
        self.db.execute(CREATE_PATTERN_TABLE)  
        self.db.execute(CREATE_ADVERTISER_TABLE)  
 
        self.db.execute(ADVERTISER_FIXTURE) 
        self.db.execute(FUNNEL_FIXTURE_1)
        self.db.execute(FUNNEL_FIXTURE_2)

        self.db.execute(ACTION_FIXTURE_1)
        self.db.execute(ACTION_FIXTURE_2) 

        self.db.execute(ACTION_PATTERN_FIXTURE_1)
        self.db.execute(ACTION_PATTERN_FIXTURE_2) 
        self.db.execute(ACTION_PATTERN_FIXTURE_11)
        self.db.execute(ACTION_PATTERN_FIXTURE_21) 

        self.db.execute(FUNNEL_ACTION_FIXTURE_1)
        self.db.execute(FUNNEL_ACTION_FIXTURE_2) 
 
        api_mock = mock.MagicMock()
        api_mock.post().json['response']['segment'].__getitem__.return_value = 1

        self.app = Application([
            ('/',funnel.FunnelHandler, dict(db=self.db,api=api_mock)),
            ('/(.*?)',funnel.FunnelHandler, dict(db=self.db,api=api_mock)) 
          ],
          template_path="../../../templates"
        )

        funnel.FunnelHandler.authorized_advertisers = mock.PropertyMock(return_value=["baublebar"])
        funnel.FunnelHandler.current_advertiser = mock.PropertyMock(return_value=123456)
        funnel.FunnelHandler.current_advertiser_name = mock.PropertyMock(return_value="baublebar")

        funnel.FunnelHandler.get_current_user = mock.Mock()
        funnel.FunnelHandler.get_current_user.return_value = "test_user"

        return self.app

    def tearDown(self):
        self.db.execute("DROP TABLE funnel")
        self.db.execute("DROP TABLE funnel_actions")
        
        self.db.execute("DROP TABLE action")
        self.db.execute("DROP TABLE action_patterns") 

    def test_get(self):
        body = self.fetch("/?format=json&advertiser=baublebar", method="GET").body

        expected = [{"owner":"waikiki","advertiser":"baublebar","funnel_name":"landing+earings","actions":[{"url_pattern":["alans_pattern","alans_pattern2"],"action_name":"alans_action","action_id":1,"order":1},{"order":2,"url_pattern":["wills_pattern","wills_pattern_again"],"action_name":"wills_action","action_id":2}],"funnel_id":1},{"owner":"makiki","advertiser":"baublebar","funnel_name":"other","actions":[],"funnel_id":2}]

        actual = ujson.loads(body)

        self.assertEqual(len(actual),2)
        self.assertEqual(actual,expected)


    def test_get_logged_in(self):
        body = self.fetch("/?format=json", method="GET").body
        expected = [{"owner":"waikiki","advertiser":"baublebar","funnel_name":"landing+earings","actions":[{"url_pattern":["alans_pattern","alans_pattern2"],"action_name":"alans_action","action_id":1,"order":1},{"order":2,"url_pattern":["wills_pattern","wills_pattern_again"],"action_name":"wills_action","action_id":2}],"funnel_id":1},{"owner":"makiki","advertiser":"baublebar","funnel_name":"other","actions":[],"funnel_id":2}]

        actual = ujson.loads(body)
        
        self.assertEqual(len(actual), 2)
        self.assertEqual(actual, expected)

    def test_post(self):
        to_post = """{"owner":"waikiki","advertiser":"baublebar","funnel_name":"landing+earings","actions":[{"url_pattern":["wills_pattern","wills_pattern_again"],"action_name":"wills_action","action_id":2},{"url_pattern":["alans_pattern","alans_pattern2"],"action_name":"alans_action","action_id":1}]}"""
        
        from_post = self.fetch("/?format=json", method="POST",body=to_post)
        from_post_json = ujson.loads(from_post.body)

        funnel_id = from_post_json["response"]["funnel_id"]
        Q = "select * from funnel_actions where funnel_id = %s" % funnel_id
        funnel_actions = self.db.select_dataframe(Q)
        
        self.assertEqual(funnel_actions.order.sum(),(len(funnel_actions)*(len(funnel_actions)+1))/2) 

        from_get = self.fetch("/?format=json&id=%s" % funnel_id, method="GET")
        from_get_json = ujson.loads(from_get.body)[0]

        action_ids = map(lambda x: x['action_id'], from_get_json['actions'])

        self.assertEqual([2,1],action_ids)
        
    def test_post_no_advertiser(self):
        to_post = """{"owner":"waikiki","funnel_name":"landing+earings_two","actions":[{"url_pattern":["wills_pattern","wills_pattern_again"],"action_name":"wills_action","action_id":2},{"url_pattern":["alans_pattern","alans_pattern2"],"action_name":"alans_action","action_id":1}]}"""
        
        from_post = self.fetch("/?format=json", method="POST",body=to_post)
        from_post_json = ujson.loads(from_post.body)

        print from_post_json

        funnel_id = from_post_json["response"]["funnel_id"]
        Q = "select * from funnel_actions where funnel_id = %s" % funnel_id
        funnel_actions = self.db.select_dataframe(Q)
        
        self.assertEqual(funnel_actions.order.sum(),(len(funnel_actions)*(len(funnel_actions)+1))/2)

        from_get = self.fetch("/?format=json&id=%s" % funnel_id, method="GET")
        from_get_json = ujson.loads(from_get.body)[0]

        action_ids = map(lambda x: x['action_id'], from_get_json['actions'])

        self.assertEqual([2,1],action_ids)

    def test_put_action_order(self):
        obj = ujson.loads(POST_FIXTURE)

        from_get = self.fetch("/?format=json&id=%s" % 1, method="GET")
        from_get_json = ujson.loads(from_get.body)[0]
        original_action_ids = map(lambda x: x['action_id'], from_get_json['actions'])

        self.assertEqual([1,2],original_action_ids)

        # testing required field
        from_put = self.fetch("/?format=json", method="PUT",body=ujson.dumps(obj))

        body = ujson.loads(from_put.body)
        self.assertTrue("Missing the following parameters: id" in body["response"])

        # changing order of funnel 
        obj['funnel_id'] = 1
        from_put = self.fetch("/?format=json&id=%s" % 1, method="PUT",body=ujson.dumps(obj))
        from_put_json = ujson.loads(str(from_put.body))
        
        self.assertEqual(from_put_json['response'],obj)

        from_get = self.fetch("/?format=json&id=%s" % 1, method="GET")
        from_get_json = ujson.loads(from_get.body)[0]
        action_ids = map(lambda x: x['action_id'], from_get_json['actions'])

        self.assertEqual([2,1],action_ids)
        self.assertEqual(set(original_action_ids),set(action_ids))

    def test_put_add_remove_action(self):
        obj = ujson.loads(POST_FIXTURE)

        from_get = self.fetch("/?format=json&id=%s" % 1, method="GET")
        from_get_json = ujson.loads(from_get.body)[0]
        original_action_ids = map(lambda x: x['action_id'], from_get_json['actions'])

        self.assertEqual([1,2],original_action_ids) 

        stored_actions = obj['actions'] 

        # deleting action from funnel
        obj['actions'] = obj['actions'][:1]
        from_put = self.fetch("/?format=json&id=%s" % 1, method="PUT",body=ujson.dumps(obj))
        from_put_json = ujson.loads(str(from_put.body))
        
        self.assertEqual(from_put_json['response'],obj)

        from_get = self.fetch("/?format=json&id=%s" % 1, method="GET")
        from_get_json = ujson.loads(from_get.body)[0]
        action_ids = map(lambda x: x['action_id'], from_get_json['actions'])

        self.assertEqual([2],action_ids) 

        df = self.db.select_dataframe("select * from funnel_actions where funnel_id = 1")

        self.assertEqual(len(df),1)

        # adding action to funnel
        obj['actions'] = stored_actions
        from_put = self.fetch("/?format=json&id=%s" % 1, method="PUT",body=ujson.dumps(obj))
        from_put_json = ujson.loads(str(from_put.body))
        
        self.assertEqual(from_put_json['response'],obj)

        from_get = self.fetch("/?format=json&id=%s" % 1, method="GET")
        from_get_json = ujson.loads(from_get.body)[0]
        action_ids = map(lambda x: x['action_id'], from_get_json['actions'])

        self.assertEqual(set(original_action_ids),set(action_ids))

        df = self.db.select_dataframe("select * from funnel_actions where funnel_id = 1")
        self.assertEqual(len(df),2)
  
