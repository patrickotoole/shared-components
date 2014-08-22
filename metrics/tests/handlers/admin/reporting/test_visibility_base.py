import sys
import mock
import os
import ujson
sys.path.append("../../../../")

import pandas as pd

from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

import unittest
from metrics.handlers.admin.reporting.visibility import ViewabilityBase, ViewabilityHandler, QUERY
import mock
from mock import MagicMock, patch

correct_cols = [
    "seller",
    "tag",
    "height",
    "width",
    "domain",
    "num_served",
    "num_loaded",
    "num_visible",
    "percent_loaded",
    "percent_visible"
    ]

cols = [
    "seller",
    "tag",
    "height",
    "width",
    "domain",
    "num_served",
    "num_loaded",
    "num_visible"
]

FIXTURE1 = pd.DataFrame([[0]*8], columns=correct_cols[:-2])
WHERE_TUPLE = ("14-08-20", "14-08-21", "00", "05", "seller,tag,width,height,domain")
WHERE_TUPLE_OPTIONAL=("ebay.com", "2928439", "23849")
WHERE_COMBINED = WHERE_TUPLE + WHERE_TUPLE_OPTIONAL
WHERE_CLAUSE = 'date >= "14-08-20" and date <= "14-08-21" and hour >= "00" and hour <= "05"'
WHERE_CLAUSE2 = 'date >= "14-08-20" and date <= "14-08-21" and hour >= "00" and hour <= "05" and domain="ebay.com" and tag="2928439" and seller="23849"'
GROUP_BY_CLAUSE = 'seller,tag,width,height,domain'
SELECT_CLAUSE = GROUP_BY_CLAUSE
FIXTURE2 = QUERY.format(SELECT_CLAUSE, WHERE_CLAUSE, GROUP_BY_CLAUSE)
FIXTURE3 = QUERY.format(SELECT_CLAUSE, WHERE_CLAUSE2, GROUP_BY_CLAUSE)

class ViewabilityBaseTest(unittest.TestCase):

    def setUp(self):
        self.base = ViewabilityBase(MagicMock())
        pass

    def tearDown(self):
        pass

    def test_bad_query(self):
        self.base.hive.session_execute.side_effect = StandardError("This is a test message!")
        self.assertRaises(StandardError, self.base.execute_query, ("select * from all"))
        pass

    def test_good_query(self):
        self.base.hive.session_execute.return_value = pd.DataFrame()
        blah = self.base.execute_query("select * from all")
        self.assertTrue(type(blah)==pd.DataFrame)

    def test_formatter(self):
        blah = self.base.format_results(FIXTURE1.copy(), cols)
        self.assertEqual(set(blah.columns),set(correct_cols))
    
    def test_construct_query(self):
        blah = self.base.construct_query(*WHERE_TUPLE)
        self.assertEqual(blah, FIXTURE2)

        blah = self.base.construct_query(*WHERE_COMBINED)
        self.assertEqual(blah, FIXTURE3)

    def test_pull_report(self):
        with patch.object(self.base, "execute_query", return_value=FIXTURE1.copy()):
            blah = self.base.pull_report(*WHERE_COMBINED)
            self.assertEqual(set(blah.columns), set(correct_cols))

        with patch.object(self.base, "execute_query", return_value=pd.DataFrame()):
            self.assertRaises(StandardError, self.base.pull_report, *WHERE_COMBINED)
            
    
