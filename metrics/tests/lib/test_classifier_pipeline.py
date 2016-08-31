import mock, pandas, json
import unittest

import lib.topic_queue.queue_to_store as qts

def check_query(q):
    self.assertTrue("fake_table" in q)
    self.assertTrue("values" in q)

class ClassifierTestCase(unittest.TestCase):

    def setUp(self):
        mock_db = mock.MagicMock()
        mock_db.side_effect = lambda x : check_query(x)
        self.instance = qts.QueueInsert("fake_table", ["col1","col2"], mock_db)

    def test_create_params_pass(self):
        result = self.instance.create_db_dict({"col1":"val1","col2":"val2"})
        self.assertEquals(set(result.keys()), set(['table_name', 'columns', 'subquery']))
        self.instance.process_message({"col1":"val1","col2":"val2"})

    def test_create_params_fail(self):
        self.assertRaises(KeyError, self.instance.create_db_dict,{"col1":"val1","col4":"val4"})

    def test_insert_params_fail(self):
        self.assertRaises(Exception, self.instance.process_message,{"col1":"val1","col4":"val4"})    
