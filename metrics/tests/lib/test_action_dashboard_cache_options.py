import mock, pandas, json
import unittest
import lib.caching.action_dashboard_cache as adc


JSON_1 = {"response":[{"url_pattern" :["segment"], "action_name" : "segment", "action_id":0}]}
JSON_2 = {"response" :[{"url_pattern" :["segment"], "action_name" : "segment", "action_id":0},{"url_pattern" :["not_segment"], "action_name" : "not_segment", "action_id":1}]}

class ActionCacheRunTest(unittest.TestCase):
    
    def setUp(self):
        adc.ActionCache.make_request = mock.MagicMock()
        adc.ActionCache.make_request.side_effect = lambda x :""
        adc.ActionCache.zookeeper = mock.MagicMock()
        adc.ActionCache.zookeeper.start.side_effect = lambda: ""
        adc.ActionCache.get_segments = mock.MagicMock()
        adc.ActionCache.get_segments.side_effect = lambda : ""
        adc.ActionCache.req = mock.MagicMock()
        adc.ActionCache.req.get.side_effect = lambda x : ""
        adc.ActionCache.insert = mock.MagicMock()
        adc.ActionCache.insert.side_effect = lambda x : x
        
    def testSegmentRunSizeOne(self):
        adc.run_advertiser_segment("advertiser", "password",mock.MagicMock(), "")
        selected_seg = adc.select_segment("segment", JSON_1['response'])
        self.assertEquals(len(selected_seg), 1)
        self.assertEquals(selected_seg[0]["url_pattern"][0], "segment")

    def testSegmentRunSizeTwo(self):
        adc.run_advertiser_segment("advertiser", "password",mock.MagicMock(), "")
        selected_seg = adc.select_segment("segment", JSON_2['response'])
        self.assertEquals(len(selected_seg),1)
        self.assertEquals(selected_seg[0]["url_pattern"][0], "segment")
