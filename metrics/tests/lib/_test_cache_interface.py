import mock, pandas, json
import unittest

import lib.caching.cache_interface as ai

JSON_FIXTURE = {"response":[{"url_pattern":"", "action_name":"", "action_id":""}]} 
JSON_FIXTURE_6 = {"response":[]}
JSON_FIXTURE_7 = {}

def buildHelper(fix):
    def get_helper(url, cookies=None):
        response = mock.Mock(json=fix)
        return response
    return get_helper

class CacheInterfaceTestCase(unittest.TestCase):
    
    def setUp(self):
        mock_zk = mock.MagicMock()
        mock_zk.start.side_effect = lambda : ""
        mock_db = mock.MagicMock()
        connectors = {'db': mock_db, "zk":mock_zk}
        mock_crusher = mock.MagicMock()
        self.instance = ai.CacheInterface("advertiser",mock_crusher, mock_db, mock_zk)

    def test_segments_query(self):
        self.instance.crusher_api.get.side_effect =mock.MagicMock(side_effect=buildHelper(JSON_FIXTURE)) 
        segments = self.instance.get_segments()
        self.assertIs(type(segments), list)
        self.assertTrue(len(segments)>=1)

    def test_segments_failure1(self):
        self.instance.crusher_api.get.side_effect = mock.MagicMock(side_effect=buildHelper(JSON_FIXTURE_6))
        segments = self.instance.get_segments()
        self.assertIs(type(segments), list)
        self.assertTrue(len(segments)==0)

    def test_segments_failure1(self):
        self.instance.crusher_api.get.side_effect = mock.MagicMock(side_effect=buildHelper(JSON_FIXTURE_7))
        segments = self.instance.get_segments()
        self.assertIs(type(segments), list)
        self.assertTrue(len(segments)==0)
