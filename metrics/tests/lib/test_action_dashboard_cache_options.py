import mock, pandas, json
import unittest
import lib.caching.action_dashboard_cache as adc


JSON_1 = {"response":[{"url_pattern" :["segment"], "action_name" : "segment", "action_id":0}]}
JSON_2 = {"response" :[{"url_pattern" :["segment"], "action_name" : "segment", "action_id":0},{"url_pattern" :["not_segment"], "action_name" : "not_segment", "action_id":1}]}

class ActionCacheRunTest(unittest.TestCase):
    
    def setUp(self):
        mock_zk= mock.MagicMock()
        mock_zk.start.side_effect = lambda: ""
        self.adc = adc
        self.adc.ActionCache("","","",zookeeper=mock_zk)
        self.adc.make_request = mock.MagicMock()
        self.adc.make_request.side_effect = lambda x :""
        self.adc.get_segments = mock.MagicMock()
        self.adc.get_segments.side_effect = lambda : ""
        self.adc.req = mock.MagicMock()
        self.adc.req.get.side_effect = lambda x : ""
        self.adc.insert = mock.MagicMock()
        self.adc.insert.side_effect = lambda x : x
        
    def testSegmentRunSizeOne(self):
        self.adc.run_advertiser_segment("advertiser", "password",mock.MagicMock(), "")
        selected_seg = adc.select_segment("segment", JSON_1['response'])
        self.assertEquals(len(selected_seg), 1)
        self.assertEquals(selected_seg[0]["url_pattern"][0], "segment")

    def testSegmentRunSizeTwo(self):
        self.adc.run_advertiser_segment("advertiser", "password",mock.MagicMock(), "")
        selected_seg = adc.select_segment("segment", JSON_2['response'])
        self.assertEquals(len(selected_seg),1)
        self.assertEquals(selected_seg[0]["url_pattern"][0], "segment")
