import mock, pandas, json
import unittest

import lib.caching.cache_runner_base as crb

JSON_FIXTURE_1 = {'domains':[{"domain":"test","count":0}]}
JSON_FIXTURE_2 = {'domains':[{"domain":"blank", "count":"1"}, {"domain":"blank","count":"1"},{"domain":"blank","count":"1"}]}
JSON_FIXTURE_3 = {'domains':[""]}
JSON_FIXTURE_4 = {}
JSON_FIXTURE_5 = {"response":[{"url_pattern":"", "action_name":"", "action_id":""}]} 
JSON_FIXTURE_6 = {"response":[]}
JSON_FIXTURE_7 = {}
JSON_FIXTURE_8 = ""



class CacheRunnerBaseTestCase(unittest.TestCase):
    
    def setUp(self):
        mock_zk = mock.MagicMock()
        mock_zk.start.side_effect = lambda : ""
        mock_db = mock.MagicMock()
        connectors = {'db': mock_db, "zk":mock_zk}
        mock_crusher = mock.MagicMock()
        self.instance = crb.BaseRunner(mock_connectors)

