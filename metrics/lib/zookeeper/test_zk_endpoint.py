import sys
import mock
import os

import unittest
import metrics.lib.zookeeper.zk_helper as zk_helper

DICT_1 = {"node":{"pattern":'"source":"test',"label":""},"children":[]}
DICT_2 = {"node":{"pattern":"","label":"_patterns"},"children":[DICT_1]}
DICT_2_DNE = {"node":{"pattern":"","label":"_actions"},"children":[DICT_1]}
DICT_2_BLANK = {"node":{"pattern":"","label":"_patterns"},"children":[]}
DICT_3 = {"node":{"pattern":"","label":""}, "children":[DICT_2]}
DITC_3_DNE = {{"node":{"pattern":"","label":""}, "children":[DICT_2_DNE]}
DICT_3_BLANK = {"node":{"pattern":"","label":""}, "children":[DICT_2_BLANK]}
DICT_3_BLANK_2 = {"node":{"pattern":"","label":""}, "children":[DICT_2_BLANK_2]}
DICT_4 = {"node":{"pattern":"","label":""}, "children":[]}

class ZKTreeTestCase(unittest.TestCase):
    """
    # This should be moved to another location inside of lib testing
    """
    def setUp(self):
        self.instance = zk_helper.ZKHelper()
        #zke.ZKEndpoint = mock.MagicMock()


    def test_find_label_base(self):
        obj = [{"pattern":False,"label":False},{"pattern":False,"label":"_patterns"}]
        check = zk_helper.ZKHelper().search_tree_children(obj,DICT_3)
        self.assertEqual(check, DICT_2)

    def test_find_label_does_not_exist(self:
        obj = [{"pattern":False,"label":False},{"pattern":False,"label":"_patterns"}]
        check = zk_helper.ZKHelper().search_tree_children(obj,DICT_3_DNE)
        self.assertEqual(check,False)

    def test_find_label_blank_children(self):
        obj = [{"pattern":False,"label":False},{"pattern":False,"label":"_patterns"}]
        check = zk_helper.ZKHelper().find_label_child("_patterns",DICT_3_BLANK)
        self.assertEqual(check, [])

    def test_search_tree_child_base(self):
        obj =[{"pattern":False,"label":False},{"pattern":False,"label":"_patterns"},{"pattern":'"source":"test',"label":False}]
        check = zk_helper.ZKHelper().search_tree_child(obj, DICT_3)
        self.assertEqual(check, DICT_1)

    def test_search_tree_child_does_not_exist(self):
        obj = [{"pattern":False,"label":False},{"pattern":False,"label":"_patterns"},{"pattern":'"source":"test',"label":False}]
        check = zk_helper.ZKHelper().search_tree_child(obj, DICT_3_DNE)
        self.assertEqual(check, False)

    def test_search_tree_node_base(self):
        obj = [{"pattern":False,"label":False},{"pattern":False,"label":"_patterns"}]
        check = zk_helper.ZKHelper().search_tree_child(obj, DICT_3)

    def test_search_tree_node_does_not_exist(self):
        obj = [{"pattern":False,"label":False},{"pattern":False,"label":"_patterns"}]
        check = zk_helper.ZKHelper().search_tree_child(obj, DICT_3)

    def test_iterate_tree(self):
        check = zk_helper.ZKHelper().iterate_tree("pattern",'"source":"test',DICT_2["children"],"node")
        self.assertEqual(check,DICT_1)

    def test_create_node(self):
        node = zk_helper.ZKHelper().create_node(pattern = '"source":"test')
        self.assertEqual(node, DICT_1)

    def test_search_tree(self):
        validation_object = [{"label":False, "pattern":False},{"pattern":False,"label":"_patterns"}]
        check = zk_helper.ZKHelper().search_tree(validation_object, DICT_3)
        self.assertEqual(check, DICT_4)

    def test_remove_label(self):
        check = zk_helper.ZKHelper().remove_label_node("_patterns", DICT_3)
        self.assertEqual(check, DICT_4)

#def test_find_advertiser(self):
#    node = zk_helper.ZKHelper().create_node(pattern = '"source":"test')
#    self.assertEqual(check,DICT_1)
