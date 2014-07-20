import sys
import mock
import os
sys.path.append("../../../../")

import unittest
from lib.buffers.buffered_socket.redis import RedisApprovedUID


class RedisApprovedTestCase(unittest.TestCase):
    def setUp(self):
        # mock for the redis server is just a dict
        self.redis = RedisApprovedUID([{"x":"y"}])

    def test_get(self):
        result = self.redis.get("x")
        expected = {"approved_user":"y"}
        self.assertEqual(result,expected)

    def test_get_multiple(self):
        l = [{"x":"y"},{"z":"y","y":"q"},{"y":"x"}]
        self.redis.redis_list = l
        
        result_1 = self.redis.get("x")
        expected_1 = {"approved_user":"y"}

        self.assertEqual(result_1,expected_1)


        result_2 = self.redis.get("y")
        expected_2 = {"approved_user":"q"}

        self.assertEqual(result_2,expected_2)

