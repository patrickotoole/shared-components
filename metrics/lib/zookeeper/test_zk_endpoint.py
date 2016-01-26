import sys
import mock
import os

import unittest
import metrics.lib.zookeeper.zk_tree as zk_tree
import metrics.lib.zookeeper.zk_base as zk_base
import metrics.lib.zookeeper.zk_endpoint as zk_end

DICT_1 = {"node":{"pattern":'"source":"test',"label":""},"children":[]}
DICT_2 = {"node":{"pattern":"","label":"_patterns"},"children":[DICT_1]}
DICT_3 = {"patternTree":{"node":{"pattern":"","label":""}, "children":[DICT_2]}}

class ZKTreeTestCase(unittest.TestCase):
    """
    # This should be moved to another location inside of lib testing
    """
    def setUp(self):
        self.instance = zk_end.ZKHelper()

    def test_find_label(self):
        check = self.instance.find_label_child("_patterns",DICT_3)
        self.assertEqual(check, DICT_2)

    def test_iterate_tree(self):
        check = self.instance.iterate_tree("pattern",'"source":"test',DICT_2["children"],"node")
        self.assertEqual(check,DICT_1)

    def test_create_node(self):
        node = self.instance.create_node(pattern = '"source":"test')
        self.assertEqual(node, DICT_1)

    def test_find_advertiser(self):
        check = self.instance.find_advertiser_child("test",DICT_3)
        self.assertEqual(check,DICT_1)


