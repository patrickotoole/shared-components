import mock, pandas, json
import unittest
import lib.caching.action_dashboard_cache as adc


JSON_1 = {"response":[{"url_pattern" :["segment"], "action_name" : "segment", "action_id":0}]}
JSON_2 = {"response" :[{"url_pattern" :["segment"], "action_name" : "segment", "action_id":0},{"url_pattern" :["not_segment"], "action_name" : "not_segment", "action_id":1}]}

class ActionCacheRunTest(unittest.TestCase):
    
    def setUp(self):
        adc.make_request = mock.MagicMock()
        adc.make_request.side_effect = lambda x :""
        adc.get_segments = mock.MagicMock()
        adc.get_segments.side_effect = lambda : ""
        adc.req = mock.MagicMock()
        adc.req.get.side_effect = lambda x : ""
        adc.insert = mock.MagicMock()
        adc.insert.side_effect = lambda x : x
        
    def testSegmentRunSizeOne(self):
        mock_ac = mock.MagicMock()
        adc.run_advertiser_segment(mock_ac, "user","")
        selected_seg = adc.select_segment("segment", JSON_1['response'])
        self.assertEquals(len(selected_seg), 1)
        self.assertEquals(selected_seg[0]["url_pattern"][0], "segment")

    def testSegmentRunSizeTwo(self):
        mock_ac = mock.MagicMock()
        adc.run_advertiser_segment(mock_ac,"user", "")
        selected_seg = adc.select_segment("segment", JSON_2['response'])
        self.assertEquals(len(selected_seg),1)
        self.assertEquals(selected_seg[0]["url_pattern"][0], "segment")
