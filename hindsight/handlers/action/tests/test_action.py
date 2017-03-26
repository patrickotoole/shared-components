from tornado.testing import AsyncHTTPTestCase 
from tornado.web import  Application, RequestHandler 
import unittest
import mock
import ujson
from link import lnk 
import logging
import handlers.action as action
import lib.zookeeper.zk_endpoint as zke

CREATE_ACTION_TABLE = """
CREATE TABLE `action` (
  `action_id` int(11) NOT NULL AUTO_INCREMENT,
  `start_date` varchar(8) NOT NULL,
  `end_date` varchar(8) NOT NULL,
  `operator` enum('and','or') NOT NULL,
  `pixel_source_name` varchar(250) DEFAULT NULL,
  `action_name` varchar(100) DEFAULT NULL,
  `action_type` enum('segment','vendor') DEFAULT 'segment',
  `active` tinyint(1) DEFAULT '1',
  `deleted` tinyint(1) DEFAULT '0',
  `featured` tinyint(1) DEFAULT '1',
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
INSERT INTO action (`action_id`,`start_date`,`end_date`, `operator`, `pixel_source_name`, `action_name`, `action_type`, `active`, `featured`) 
VALUES (1,0,0,"and","rich","/","segment",1,1)
"""

ACTION_FIXTURE_2 = """
INSERT INTO action (`action_id`,`start_date`,`end_date`, `operator`, `pixel_source_name`, `action_name`, `action_type`, `active`, `featured`) 
VALUES (2,0,0,"and","mulberry","street", "segment",1,1) 
"""

class ActionTest(AsyncHTTPTestCase):

    
    # same as in test_creative_reporting.py
    def get_app(self):        
        self.db = lnk.dbs.test

        
        len_check = self.db.execute("show tables like 'action_patterns'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE action_patterns")
        len_check2 = self.db.execute("show tables like 'action'")
        if len(len_check2.as_dataframe())>0:
            self.db.execute("DROP TABLE action")

        self.db.execute(CREATE_ACTION_TABLE) 
        self.db.execute(CREATE_PATTERN_TABLE)  
        self.db.execute(ACTION_FIXTURE_1)
        self.db.execute(ACTION_FIXTURE_2)

        self.app = Application([
            ('/',action.ActionHandler, dict(db=self.db)),
            ('/(.*?)',action.ActionHandler, dict(db=self.db)) 
          ],
          template_path="../../../templates"
        )

        action.ActionHandler.authorized_advertisers = mock.Mock(return_value=["rich", "mulberry"])
        action.ActionHandler.current_advertiser = mock.Mock(return_value=123456)
        action.ActionHandler.current_advertiser_name = mock.Mock(return_value="mulberry")

        action.ActionHandler.get_current_user = mock.Mock()
        action.ActionHandler.get_current_user.return_value = "test_user"

        zke.ZKEndpoint = mock.MagicMock()
        zke.ZKEndpoint.add_advertiser_pattern.side_effect = lambda x : x

        return self.app

    def tearDown(self):
        self.db.execute("DROP TABLE action")
        self.db.execute("DROP TABLE action_patterns")
        
    def test_get(self):        
        _a = ujson.loads(self.fetch("/?format=json&advertiser=rich",method="GET").body)
        _b = ujson.loads(self.fetch("/?format=json&advertiser=mulberry",method="GET").body)
        self.assertEqual(len(_a["response"]),1)
        self.assertEqual(len(_b["response"]),1)

    def test_post(self):
        action_json = """{
          "advertiser": "homie",
          "action_name" : "yo homie",
          "url_pattern": ["a","b","c"],
          "operator": "and",
          "deleted":"0",
          "action_type":"segment"
        }"""

        _a = self.fetch("/?format=json&",method="POST",body=action_json).body

        ajson = ujson.loads(_a)
        ojson = ujson.loads(action_json)
        self.assertEqual(ajson['response']['action_name'],ojson['action_name'])
        self.assertEqual(ajson['response']['url_pattern'],ojson['url_pattern']) 

    def test_put_param_check(self):
        action_put = self.fetch("/?format=json", method="PUT", body=ujson.dumps({})).body
        action_put_json = ujson.loads(action_put)["error"]

        expected = "Missing the following parameters: id"
        self.assertEqual(action_put_json, expected)
 
    def test_update(self):
        action_string = """
            {
                "pixel_source_name":"baublebar",
                "action_name":"random action",
                "operator":"and",
                "url_pattern":["http://www.baublebar.com/necklaces.html"],
                "advertiser":"baublebar",
                "deleted":"0",
                "action_type":"segment"
            }
        """

        action_posted = self.fetch("/?format=json&",method="POST",body=action_string).body
        action_get_json = ujson.loads(self.fetch("/?format=json&advertiser=baublebar",method="GET").body)['response']
        self.assertEqual(ujson.loads(action_string)['action_name'],action_get_json[0]['action_name'])
        self.assertEqual(ujson.loads(action_string)['url_pattern'],action_get_json[0]['url_pattern']) 
        
        action_json = ujson.loads(action_string)
        action_json['action_name'] = "NEW NAME" 

        action_json['action_id'] = action_get_json[0]['action_id']
        action_post = self.fetch("/?format=json&",method="POST",body=ujson.dumps(action_json)).body

        action_put = self.fetch("/?format=json&id=%s" % action_json['action_id'],method="PUT",body=ujson.dumps(action_json)).body
        action_put_json = ujson.loads(action_put)['response']

        self.assertEqual(action_put_json['action_name'],"NEW NAME") 

        Q = "select * from action_patterns where action_id = %s"
        df = self.db.select_dataframe(Q % action_get_json[0]['action_id'])
        self.assertEqual(len(df),1)

        action_json['url_pattern'] = ["only_one"]
        action_put = self.fetch("/?format=json&id=%s" % action_json['action_id'],method="PUT",body=ujson.dumps(action_json)).body
        action_put_json = ujson.loads(action_put)['response']

        self.assertEqual(action_put_json['url_pattern'],["only_one"]) 

        df = self.db.select_dataframe(Q % action_get_json[0]['action_id']) 
        self.assertEqual(len(df),1)