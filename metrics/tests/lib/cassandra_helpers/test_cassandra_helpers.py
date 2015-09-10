import sys
import mock
import os
sys.path.append("../../../")

import unittest
import metrics.lib.cassandra_helpers.range_query as range_query
from cassandra.query import PreparedStatement, BoundStatement

class CassandraTestCase(unittest.TestCase):
    """
    # This is for testing cassandra helpers that were added to the repo
    """

    def setUp(self):
        self.cassandra = mock.MagicMock()
        self.cassandra.prepare.side_effect = lambda x: PreparedStatement([[mock.MagicMock()]],"","","","","","")
        self.cassandra.execute_async.side_effect = lambda x: x


    def test_range_query(self):
        rq = range_query.CassandraRangeQuery()
        rq.cassandra = self.cassandra

        statement = rq.build_statement("","","")
        self.assertIsInstance(statement,PreparedStatement)
        
    def test_data_plus_values(self):
        rq = range_query.CassandraRangeQuery()

        result = rq.data_plus_values([["asdf"]],[1,2,3])

        self.assertEqual(len(result),3)
        self.assertEqual(result[0][1],1)


    def test_bind_and_execute(self):
        rq = range_query.CassandraRangeQuery()
        rq.cassandra = self.cassandra

        statement = rq.build_statement("","","")
        bound = rq.bind_and_execute(statement)

        bound_statement = bound([1]) 
        self.assertIsInstance(bound_statement,BoundStatement)

        with self.assertRaises(ValueError):
            bound([1,2]) 



