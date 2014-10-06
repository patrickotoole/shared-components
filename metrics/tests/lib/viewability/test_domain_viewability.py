import sys
import mock
import os
sys.path.append("../../../")

import unittest
import metrics.lib.viewability.domain as domain
import pandas
from StringIO import StringIO
from link import lnk
CSV_OBJ = """domain,loaded,spent,type,visible,served
123freevectors.com,1,0.00317,bigstock_online_graphic&themes,0,2
9to5mac.com,7,0.016804524,bigstock_tech_news,3,8
abduzeedo.com,50,0.122111834,bigstock_online_graphic&themes,29,188
abduzeedo.com,50,0.122111834,bigstock_perf2,29,188
abeautifulmess.com,16,0.041350000000000005,baublebar_womens_interest,3,27
abeautifulmess.com,16,0.041350000000000005,journelle_perf,3,27""" 

DF = pandas.read_csv(StringIO(CSV_OBJ))

class ViewabilityDomainAPITestCase(unittest.TestCase):
    """
    # testing viewability automation
    """

    def setUp(self):
        self.va = domain.DomainAPI(mock.MagicMock(),mock.MagicMock(),mock.MagicMock())

    def test_pull_campaigns_success(self):
        MOCKED_JSON_RESPONSE = {"response":{"line-item":{"campaigns":[{"id":1}],"advertiser_id":1}}}
        self.va.an_api.get.return_value = mock.MagicMock(json=MOCKED_JSON_RESPONSE)
        campaign_list = self.va.pull_campaign_ids(1234)
        self.assertEqual(campaign_list,[1])


    def test_pull_campaigns_failure(self):
        MOCKED_JSON_RESPONSE = {"response":{}}
        self.va.an_api.get.return_value = mock.MagicMock(json=MOCKED_JSON_RESPONSE)
        with self.assertRaises(KeyError):
            campaign_list = self.va.pull_campaign_ids(1234)

    def test_get_viewability_df(self):

        with mock.patch.object(domain.DomainAPI,"get_viewability_df",return_value=DF):
            columns = self.va.get_viewability_df("baublebar_womens_interest").columns
            self.assertEqual(list(columns),['domain', 'loaded', 'spent', 'type', 'visible', 'served'])
     
 

class ViewabilityDomainAnalysisTestCase(unittest.TestCase):
    """
    # testing viewability automation
    """

    def setUp(self):
        CONFIG = {
            "learn_line_item_id": 1,
            "blacklist_threshold":1,
            "whitelist_threshold":0,
            "loaded_threshold": 0,
            "learn_size": 1,
            "domain_list_id": "baublebar_womens_interest"
        }
        self.va = domain.DomainAnalysis(mock.MagicMock(),mock.MagicMock(),mock.MagicMock(),**CONFIG)

    def test_get_viewability_report(self):
        with mock.patch.object(domain.DomainAPI,"get_viewability_df",return_value=DF): 
            df = self.va.get_viewability_report()
            self.assertEqual(list(df.columns),['served', 'visible', 'loaded', 'percent_visible', 'percent_loaded'])

    def test_get_viewability_report(self):
        with mock.patch.object(domain.DomainAPI,"get_viewability_df",return_value=DF): 
            df = self.va.get_whitelist()
            self.assertEqual(list(df.columns),['served', 'visible', 'loaded', 'percent_visible', 'percent_loaded'])

    def test_get_viewability_report(self):
        with mock.patch.object(domain.DomainAPI,"get_viewability_df",return_value=DF): 
            df = self.va.get_blacklist()
            self.assertEqual(list(df.columns),['served', 'visible', 'loaded', 'percent_visible', 'percent_loaded'])

    
