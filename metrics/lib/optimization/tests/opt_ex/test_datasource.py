import pandas as pd
import unittest
import sys
sys.path.append("../../")
from opt_ex import DataSourceExample

import mock
from mock import MagicMock

# We'll use this as an example of "pulled" data, since we don't want to
# actually query for data during each run of the test
FIXTURE1 = pd.DataFrame([
        {
            "advertiser": "test_advertiser", 
            "campaign": "129381", 
            "tag": "1234", 
            "num_served": 100, 
            "num_visible": 30
        },
        {
            "advertiser": "test_advertiser", 
            "campaign": "102392", 
            "tag": "5678", 
            "num_served": 100, 
            "num_visible": 20
        },
        {
            "advertiser": "test_advertiser", 
            "campaign": "102392", 
            "tag": None, 
            "num_served": 100, 
            "num_visible": 20
        }
        ])

class DataSourceExampleTest(unittest.TestCase):
    def setUp(self):
        self.d = DataSourceExample(["test_advertiser"])
        self.d.df = FIXTURE1

    def tearDown(self):
        pass

    def test_transform(self):
        self.d.transform()
        expected = pd.DataFrame([
        {
            "advertiser": "test_advertiser", 
            "campaign": "129381", 
            "tag": "1234", 
            "num_served": 100, 
            "num_visible": 30,
            "percent_visible": .3
        },
        {
            "advertiser": "test_advertiser", 
            "campaign": "102392", 
            "tag": "5678", 
            "num_served": 100, 
            "num_visible": 20,
            "percent_visible": .2
        }
        ])

        # Don't directly compare dataframes (they are awkward to compare), just
        # compare their dictionary equivalents instead
        self.assertEqual(expected.to_dict(), self.d.df.to_dict())
        pass
