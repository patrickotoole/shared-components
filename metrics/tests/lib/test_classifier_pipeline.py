import mock, pandas, json
import unittest

import lib.topic_queue.queue_to_store as qts


class ClassifierTestCase(unittest.TestCase):

    def setUp(self):
        mock_db = mock.MagicMock()
        self.instance = qts.QueueInsert("fake_name", ["col1","col2"], mock_db)

    def test_create_params_pass(self):
        result = self.instance.create_db_dict({"col1":"val1","col2":"val2"})
        self.assertEquals(set(result.keys()), set(['table_name', 'columns', 'subquery']))

    def test_create_params_fail(self):
        self.assertRaises(KeyError, self.instance.create_db_dict,{"col1":"val1","col4":"val4"})
