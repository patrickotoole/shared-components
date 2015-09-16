import sys
import mock
import os
sys.path.append("../../")

import unittest
import metrics.lib.zookeeper.zk_tree as zk_tree
import metrics.lib.zookeeper.zk_base as zk_base


class ZKTreeTestCase(unittest.TestCase):
    """
    # This should be moved to another location inside of lib testing
    """

    def setUp(self):
        pass

    # replace the code that interfaces externally
    @mock.patch("metrics.lib.zookeeper.zk_base.KazooClient") 
    def test_internal_get(self,mock):

        mock_instance = mock()
        mock_instance.get.side_effect = lambda x: ("GOTTEN %s" % x, 0)

        zk = zk_tree.ZKBase()
        self.assertEqual(zk.get_path("path"),"GOTTEN path")

    @mock.patch("metrics.lib.zookeeper.zk_base.KazooClient") 
    def test_internal_create_or_update(self,mock):

        mock_instance = mock()
        mock_instance.exists.return_value = True
        mock_instance.set.side_effect = lambda x,y: "SET %s %s" % (x,y)

        zk = zk_tree.ZKBase()
        self.assertEqual(zk.create_or_update("path","data"),"SET path data")

        mock_instance.exists.return_value = False
        mock_instance.create.side_effect = lambda x,y: "CREATE %s %s" % (x,y)

        self.assertEqual(zk.create_or_update("path","data"),"CREATE path data")

    @mock.patch("metrics.lib.zookeeper.zk_tree.KazooClient") 
    def test_get_tree(self,kazoo):

        zk = zk_tree.ZKTree()
        zk.get_path = mock.Mock()
        zk.get_path.return_value = "{}"

        value = zk.get_tree()

        self.assertEqual({},value)

    @mock.patch("metrics.lib.zookeeper.zk_tree.KazooClient") 
    def test_set_tree(self,mock):

        zk = zk_tree.ZKTree()
        zk.create_or_update = mock.Mock()
        zk.create_or_update.return_value = "{}"

        zk.get_path = mock.Mock()
        zk.get_path.return_value = "{}"


        value = zk.get_tree()

        self.assertEqual({},value)
