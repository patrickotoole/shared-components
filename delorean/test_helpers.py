import mock
import os
import helpers
import pandas

import unittest

class HelperTestCase(unittest.TestCase):
    """
    # This should run unit tests of helpers
    """

    def setUp(self):
        pass

    def test_group_by_segment_bad_data(self):
        with self.assertRaises(Exception): grouped = helpers.group_by_segment([{"segment_value":3,"seg":2,"uid":1},{"segment_value":2,"seg":1,"uid":0}],pandas.DataFrame([{"segment":1,"appnexus_name":"testname1"},{"segment":2,"appnexus_name":"testname2"}]))

    def test_group_by_segment_missing_appnexus_name(self):
        with self.assertRaises(Exception): grouped = helpers.group_by_segment([{"segment_value":3,"segment":2,"uid":1},{"segment_value":2,"segment":1,"uid":0}],None)

    def test_group_by_segment_merge(self):
        grouped = helpers.group_by_segment([{"segment_value":3,"segment":3,"uid":1},{"segment_value":2,"segment":1,"uid":0}],
            pandas.DataFrame([{"segment":1,"appnexus_name":"testname1"},{"segment":2,"appnexus_name":"testname2"}]))

        self.assertTrue(len(grouped) == 1)
        self.assertTrue(grouped[0]['segment'] == 1)
        self.assertTrue(grouped[0]['appnexus_name'] == "testname1")

    def test_group_by_segment_duplicate(self):
        grouped = helpers.group_by_segment([{"segment_value":1,"segment":1,"uid":1},{"segment_value":1,"segment":1,"uid":1}],
            pandas.DataFrame([{"segment":1,"appnexus_name":"testname1"},{"segment":2,"appnexus_name":"testname2"}]))

        self.assertTrue(len(grouped) == 1)
        self.assertTrue(grouped[0]['uid'] == 1)

    def test_group_by_segment_multiple_users(self):
        grouped = helpers.group_by_segment([{"segment_value":1,"segment":1,"uid":1},{"segment_value":1,"segment":1,"uid":0}],
            pandas.DataFrame([{"segment":1,"appnexus_name":"testname1"},{"segment":2,"appnexus_name":"testname2"}]))

        self.assertTrue(len(grouped) == 1)
        self.assertTrue(grouped[0]['uid'] == 2)

    def test_group_by_segment_multiple_segments(self):
        grouped = helpers.group_by_segment([{"segment_value":1,"segment":2,"uid":1},{"segment_value":1,"segment":1,"uid":0}],
            pandas.DataFrame([{"segment":1,"appnexus_name":"testname1"},{"segment":2,"appnexus_name":"testname2"}]))

        self.assertTrue(len(grouped) == 2)
        self.assertTrue(grouped[0]['uid'] == 1)

    def test_group_by_segment_value(self):
        grouped = helpers.group_by_segment([{"segment_value":1,"segment":1,"uid":1},{"segment_value":2,"segment":1,"uid":0}],
            pandas.DataFrame([{"segment":1,"appnexus_name":"testname1"},{"segment":2,"appnexus_name":"testname2"}]))

        self.assertTrue(len(grouped) == 2)
        self.assertTrue(grouped[0]['uid'] == 1)

    def test_parse_segment(self):
        result = helpers.parse_segment_log("uid,segment:value:expiration")
        self.assertEqual(result['uid'],"uid")
        self.assertEqual(result['segment'],"segment")
        self.assertEqual(result['segment_value'],"value")

    def test_parse_segment_missing_comma(self):
        with self.assertRaises(Exception):
            helpers.parse_segment_log("uidsegment:value:expiration")
