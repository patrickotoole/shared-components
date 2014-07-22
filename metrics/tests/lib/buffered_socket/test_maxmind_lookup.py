import sys
import mock
import os
sys.path.append("../../../")

import unittest
from lib.buffered_socket.maxmind import MaxmindLookup


class RedisApprovedTestCase(unittest.TestCase):
    def setUp(self):
        mock_maxmind_db = {
            "162.243.2.248":{"country":{"geoname_id":6252001,"iso_code":"US","names":{"ru":"\\u0421\\u0428\\u0410","fr":"\\u00c9tats-Unis","en":"United States","de":"USA","zh-CN":"\\u7f8e\\u56fd","pt-BR":"Estados Unidos","ja":"\\u30a2\\u30e1\\u30ea\\u30ab\\u5408\\u8846\\u56fd","es":"Estados Unidos"}},"registered_country":{"geoname_id":6252001,"iso_code":"US","names":{"ru":"\\u0421\\u0428\\u0410","fr":"\\u00c9tats-Unis","en":"United States","de":"USA","zh-CN":"\\u7f8e\\u56fd","pt-BR":"Estados Unidos","ja":"\\u30a2\\u30e1\\u30ea\\u30ab\\u5408\\u8846\\u56fd","es":"Estados Unidos"}},"continent":{"geoname_id":6255149,"code":"NA","names":{"ru":"\\u0421\\u0435\\u0432\\u0435\\u0440\\u043d\\u0430\\u044f \\u0410\\u043c\\u0435\\u0440\\u0438\\u043a\\u0430","fr":"Am\\u00e9rique du Nord","en":"North America","de":"Nordamerika","zh-CN":"\\u5317\\u7f8e\\u6d32","pt-BR":"Am\\u00e9rica do Norte","ja":"\\u5317\\u30a2\\u30e1\\u30ea\\u30ab","es":"Norteam\\u00e9rica"}},"location":{"latitude":38.0,"longitude":-97.0}} 
        }
        self.maxmind = MaxmindLookup(mock_maxmind_db)

    def test_lookup(self):
        result = self.maxmind.get("162.243.2.248")
        expected = {'city': '', 'city_state': ', ', 'country': 'United States', 'latitude': 38.0, 'longitude': -97.0, 'state': ''}
 
        self.assertEqual(result,expected)

    def test_lookup_failed(self):
        result = self.maxmind.get("10.0.0.1")
        expected = {}

        self.assertEqual(result,expected)

