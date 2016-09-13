import mock
import os
import helpers

import unittest

class HelperTestCase(unittest.TestCase):
    """
    # This should run unit tests of helpers
    """

    def setUp(self):
        pass

    def test_group_by_segment_bad_data(self):
        with self.assertRaises(Exception):
            grouped = helpers.group_by_segment([{"seg":2,"uid":1},{"seg":1,"uid":0}] )

    def test_group_by_segment_duplicate(self):
        grouped = helpers.group_by_segment([{"segment":1,"uid":1},{"segment":1,"uid":1}] )

        self.assertTrue(len(grouped) == 1)
        self.assertTrue(grouped[0]['uid'] == 1)

    def test_group_by_segment_multiple_users(self):
        grouped = helpers.group_by_segment([{"segment":1,"uid":1},{"segment":1,"uid":0}] )

        self.assertTrue(len(grouped) == 1)
        self.assertTrue(grouped[0]['uid'] == 2)

    def test_group_by_segment_multiple_segments(self):
        grouped = helpers.group_by_segment([{"segment":2,"uid":1},{"segment":1,"uid":0}] )

        self.assertTrue(len(grouped) == 2)
        self.assertTrue(grouped[0]['uid'] == 1)

    def test_parse_segment(self):
        result = helpers.parse_segment_log("uid,segment:value:expiration")
        self.assertEqual(result['uid'],"uid")
        self.assertEqual(result['segment'],"segment")

    def test_parse_segment_missing_comma(self):
        with self.assertRaises(Exception):
            helpers.parse_segment_log("uidsegment:value:expiration")
