from tornado.testing import AsyncHTTPTestCase 
from tornado.web import  Application, RequestHandler 
import unittest
import mock
import mocks.yoshi as mocks
import ujson
from link import lnk 
import handlers.funnel.action as action
import lib.zookeeper.zk_endpoint as zke
import handlers.funnel.action_database_helpers as adh
import logging
CREATE_ACTION_TABLE = """
CREATE TABLE IF NOT EXISTS `action` (
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
CREATE TABLE IF NOT EXISTS `action_patterns` (
  `action_id` int(11) NOT NULL,
  `url_pattern` varchar(3000) NOT NULL
)
"""

CREATE_SUBFILTER_TABLE = """
CREATE TABLE IF NOT EXISTS action_filters (  `action_id` int(11) NOT NULL,
  `filter_pattern` varchar(256) NOT NULL DEFAULT '',
  `active` int(1) DEFAULT '1',
  `deleted` tinyint(1) DEFAULT '0',
  `created_on` datetime DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `action_id` (`action_id`)
)
"""

ACTION_FIXTURE_1 = """
INSERT INTO action (`action_id`,`start_date`,`end_date`, `operator`, `pixel_source_name`, `action_name`, `action_type`, `active`, `featured`) 
VALUES (1,0,0,"and","alan","alans_action","segment",1,1)
"""

ACTION_FIXTURE_2 = """
INSERT INTO action (`action_id`,`start_date`,`end_date`, `operator`, `pixel_source_name`, `action_name`, `action_type`, `active`, `featured`) 
VALUES (2,0,0,"and","will","wills_action", "segment",1,1) 
"""

ACTION_FIXTURE_3 = """
insert into action_patterns (action_id, url_pattern) values( 1, '/')
"""

ACTION_FIXTURE_4 = """
insert into action_patterns (action_id, url_pattern) values( 2, '/')
"""

SUBFILTER_1 = """
insert into action_filters (action_id, filter_pattern) values (1, "testpattern")
"""
SUBFILTER_2 =  """
insert into action_filters (action_id, filter_pattern) values (1, "anothertestpattern")
"""

CREATE_PARAMETERS = """
CREATE TABLE IF NOT EXISTS advertiser_udf_parameter (
  `advertiser` varchar(250) DEFAULT NULL,
  `filter_id` int(11) DEFAULT NULL,
  `udf` varchar(250) DEFAULT NULL,
  `parameters` blob
)
"""

CREATE_ACTION_PATTERN = """
CREATE TABLE IF NOT EXISTS action_with_patterns (
    pixel_source_name varchar(250),
    url_pattern varchar(250),
    action_id int(11)
)
"""

CREATE_NODE_DB = """
CREATE TABLE IF NOT EXISTS visit_events_tree_nodes_test (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `node` varchar(700) NOT NULL,
  `parent` int(10) DEFAULT NULL,
  `deleted` int(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `visit_events_tree_nodes_test_ibfk_1` (`parent`)
) 
"""

CREATE_NODE = """
insert into visit_events_tree_nodes_test (parent, node) values (3, '{"pattern":"\"source\": \"bauble","label":""}')
"""

INSERT_ACTION_PATTERN ="""
insert into action_with_patterns (pixel_source_name, url_pattern, action_id) values ("bauble", "/", 2)
"""

INSERT_ACTION_PATTERN2 ="""
insert into action_with_patterns (pixel_source_name, url_pattern, action_id) values ("bauble", "http://www.bauble.com/necklaces", 4)
"""

INSERT_NODE = """
insert into visit_events_tree_nodes_test (parent,node) values (1,'{"pattern":"/","label":"","query":"INSERT INTO rockerbox.pattern_occurrence_users_u2 (2) VALUES ()"}')
"""

INSERT_NODE2 = """
insert into visit_events_tree_nodes_test (parent,node) values (1,'{"pattern":"http://www.bauble.com/necklaces","label":"","query":"INSERT INTO rockerbox.pattern_occurrence_users_u2 (2) VALUES ()"}')
"""

class ActionTest(AsyncHTTPTestCase):

    
    # same as in test_creative_reporting.py
    def get_app(self):        
        self.db = lnk.dbs.test

        
        self.db.execute(CREATE_ACTION_TABLE) 
        self.db.execute(CREATE_PATTERN_TABLE)  

        self.db.execute(CREATE_SUBFILTER_TABLE)
        self.db.execute(CREATE_PARAMETERS )
        self.db.execute(CREATE_ACTION_PATTERN)
        self.db.execute(CREATE_NODE_DB)

        self.db.execute(INSERT_ACTION_PATTERN)
        self.db.execute(INSERT_ACTION_PATTERN2)
        self.db.execute(CREATE_NODE)
        self.db.execute(INSERT_NODE)
        self.db.execute(INSERT_NODE2)
        self.db.execute(ACTION_FIXTURE_1)
        self.db.execute(ACTION_FIXTURE_2)
        self.db.execute(ACTION_FIXTURE_3)
        self.db.execute(ACTION_FIXTURE_4)
        self.db.execute(SUBFILTER_1)
        self.db.execute(SUBFILTER_2)
        
        self.app = Application([
            ('/',action.ActionHandler, dict(db=self.db, crushercache=self.db)),
            ('/(.*?)',action.ActionHandler, dict(db=self.db, crushercache=self.db)) 
          ],
          template_path="../../../templates"
        )

        action.ActionHandler.authorized_advertisers = mock.Mock(return_value=["alan", "will"])
        action.ActionHandler.current_advertiser = mock.Mock(return_value=123456)
        action.ActionHandler.current_advertiser_name = "bauble"

        action.ActionHandler.get_current_user = mock.Mock()
        action.ActionHandler.get_current_user.return_value = "test_user"

        zke.ZKEndpoint = mock.MagicMock()
        zke.ZKEndpoint.add_advertiser_pattern.side_effect = lambda x : x

        return self.app

    def tearDown(self):
        #"TRUNCATE TABLES"
        self.db.execute("TRUNCATE table action_filters")
        self.db.execute("TRUNCATE table action")
        self.db.execute("TRUNCATE table action_patterns")
        self.db.execute("TRUNCATE table advertiser")
        self.db.execute("TRUNCATE table action_with_patterns")
        self.db.execute("TRUNCATE table visit_events_tree_nodes_test")

        self.db.execute("DROP TABLE action")
        self.db.execute("DROP TABLE action_patterns")
        
    def test_get(self):        
        _a = ujson.loads(self.fetch("/?format=json&advertiser=alan",method="GET").body)
        self.assertEqual(len(_a["response"]),1)

    def test_get_id(self):
        _a = ujson.loads(self.fetch("/?format=json&id=1&advertiser=alan",method="GET").body)
        self.assertEqual(len(_a["response"]),1)

    def test_get_subfilter(self):
        _a = ujson.loads(self.fetch("/?format=json&advertiser=alan",method="GET").body)
        self.assertEqual(len(_a["response"][0]["filter_pattern"]),2)

    @mock.patch('requests.post', mock.Mock(side_effect = lambda k,headers,data : {'response':{}}))
    def test_post(self):
        action_json = """{
          "advertiser": "bauble",
          "action_name" : "yo",
          "url_pattern": ["a"],
          "operator": "and",
          "deleted":"0",
          "action_type":"segment",
          "subfilters": ["filterA", "filterB"]
        }"""

        _a = self.fetch("/?format=json&",method="POST",body=action_json).body

        ajson = ujson.loads(_a)
        ojson = ujson.loads(action_json)
        self.assertEqual(ajson['response']['action_name'],ojson['action_name'])
        self.assertEqual(ajson['response']['url_pattern'],ojson['url_pattern']) 
        self.assertEqual(len(ajson['response']['subfilters']), 2)

    def test_put_param_check(self):
        action_put = self.fetch("/?format=json", method="PUT", body=ujson.dumps({"id":2})).body
        action_put_json = ujson.loads(action_put)["error"]

        expected = "Missing the following parameters: id"
        self.assertEqual(action_put_json, expected)
 
    @mock.patch('requests.post', mock.Mock(side_effect = lambda k,headers,data : {'response':{}}))
    @mock.patch('requests.delete', mock.Mock(side_effect = lambda k : {'response':{}}))
    def test_update(self):
        action_string = """
            {
                "pixel_source_name":"bauble",
                "action_name":"0",
                "operator":"and",
                "url_pattern":["http://www.bauble.com/necklaces"],
                "advertiser":"bauble",
                "deleted":"0",
                "action_type":"segment"
            }
        """

        action_posted = self.fetch("/?format=json",method="POST",body=action_string).body
        action_get_json = ujson.loads(self.fetch("/?format=json&advertiser=bauble",method="GET").body)['response']
        print action_get_json
        self.assertEqual(ujson.loads(action_string)['action_name'],action_get_json[0]['action_name'])
        self.assertEqual(ujson.loads(action_string)['url_pattern'],action_get_json[0]['url_pattern']) 
        
        action_json = ujson.loads(action_string)
        action_json['action_name'] = "NEW NAME" 

        action_post = self.fetch("/?format=json&",method="POST",body=ujson.dumps(action_json)).body

        print action_post
        action_post = ujson.loads(action_post)
        action_json['action_id'] = action_post['response']['action_id']
        action_put = self.fetch("/?format=json&id=%s" % action_json['action_id'],method="PUT",body=ujson.dumps(action_json)).body
        action_put_json = ujson.loads(action_put)['response']

        self.assertEqual(action_put_json['action_name'],"NEW NAME") 

        Q = "select * from action_patterns where action_id = %s"
        df = self.db.select_dataframe(Q % action_get_json[0]['action_id'])
        self.assertEqual(len(df),1)

        action_json['url_pattern'] = ["only_one"]
        action_put = self.fetch("/?format=json&id=%s" % action_json['action_id'],method="PUT",body=ujson.dumps(action_json)).body
        print action_put_json
        action_put_json = ujson.loads(action_put)['response']

        self.assertEqual(action_put_json['url_pattern'],["only_one"]) 

        df = self.db.select_dataframe(Q % action_get_json[0]['action_id'])
        self.assertEqual(len(df),1)

    @mock.patch('requests.delete', mock.Mock(side_effect = lambda k : {'response':{}}))
    def test_delete(self):
        _a = ujson.loads(self.fetch("/?id=2",method="DELETE").body)
        self.assertEqual(_a["response"]['action_id'],"2")
        self.assertEqual(_a["status"],"ok")


if __name__ == '__main__':
    unittest.main()
