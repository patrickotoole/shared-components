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
    "load_score",
    "viewable_score"
    ]

cols = [
    "seller",
    "tag",
    "height",
    "width",
    "domain",
    "num_served",
    "num_loaded",
    "num_visible",
]

FIXTURE1 = pd.DataFrame([[0]*8], columns=correct_cols[:-2])
WHERE_TUPLE = ("14-08-20", "14-08-21", "00", "05", "seller,tag,width,height,domain",{})
WHERE_TUPLE_W_OPTIONAL=("14-08-20", "14-08-21", "00", "05", "seller,tag,width,height,domain", {"venue": False, "domain": "ebay.com", "tag": "2928439", "seller": "23849"})
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

    def test_formatter(self):
        blah = self.base.format_results(FIXTURE1.copy(), cols)
        self.assertEqual(set(blah.columns),set(correct_cols))
    
    def test_constructor(self):
        blah = self.base.construct_query(*WHERE_TUPLE)
        self.assertEqual(blah, FIXTURE2)

        blah = self.base.construct_query(*WHERE_TUPLE_W_OPTIONAL)
        self.assertEqual(blah, FIXTURE3)
            
    
