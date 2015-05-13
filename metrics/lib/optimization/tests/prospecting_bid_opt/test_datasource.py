import pandas as pd
import unittest
import sys
sys.path.append("../../")
from prospecting_bid_opt import CampaignDataSource
from copy import deepcopy
import mock
from mock import MagicMock
from test_datasource_fixtures import *
from link import lnk
import ujson
import math

EXTERNAL_ADV_ID = 453991
ADVERTISER = "twice"
CAMPAIGNS = [8475832]

class CampaignDataSourceTest(unittest.TestCase):
    
    def setUp(self):
        self.d = CampaignDataSource(EXTERNAL_ADV_ID, ADVERTISER, CAMPAIGNS)
        lnk.api = mock.MagicMock()


    def tearDown(self):
        pass

    def test_pull_bad_date_strings(self):
        with self.assertRaises(ValueError):
            self.d.pull("215-04-04", "2015-04-04")


    def test_check_data_incorrect_col_types(self):
        
        ## Checking for correct column types 
        self.d.conv_data = CONV_DATA.copy()
        self.d.reporting_data = REPORTING_DATA.copy()
        
        self.d.reporting_data['creative_id'] = self.d.reporting_data['creative_id'].astype(str)

        with self.assertRaises(TypeError):
            self.d.check_data()
    
    def test_check_data_incorrect_col_types2(self):
        self.d.conv_data = CONV_DATA.copy()
        self.d.reporting_data = REPORTING_DATA.copy()
        self.d.conv_data['campaign_id'] = self.d.conv_data['campaign_id'].astype(str)
        with self.assertRaises(TypeError):
            self.d.check_data()


    def test_check_data_correct_col_types(self):
        
        ## Checking for incorrect column types
        self.d.conv_data = CONV_DATA.copy()
        self.d.reporting_data = REPORTING_DATA.copy()
        self.d.check_data()

    def test_check_data_empty_df(self):
        
        ## Checking for incorrect column types
        self.d.conv_data = CONV_DATA.copy()
        self.d.reporting_data = REPORTING_DATA.copy()
        
        self.d.reporting_data = self.d.reporting_data.drop(self.d.reporting_data.index)

        with self.assertRaises(Exception):
            self.d.check_data()
    
    
    def test_reshape_correct(self):

        ## testing correct reshape run
        self.d.conv_data = CONV_DATA.copy()
        self.d.reporting_data = REPORTING_DATA.copy()

        self.d.reshape()

        expected = MERGED_DATA.copy()
        actual = self.d.df

        self.assertEqual(expected.to_dict(), actual.to_dict())

    def test_get_max_bid_error(self):

        ## testing incorrect campaign
        self.d.console.get.side_effect = KeyError   
        with self.assertRaises(KeyError):
            self.d.get_max_bid("sample_campaign")

    def test_get_max_bid_exists(self):
        
        ## testing campaign with max bid
        m = MagicMock()
        m.json = ujson.loads(CAMPAIGN_OBJ_MAX_BID)
        self.d.console.get.return_value = m
        max_bid = self.d.get_max_bid("sample_campaign")

        self.assertTrue(max_bid > 0 )

    def test_get_max_bid_no_exists(self):

        ## testing campaign with no max bid
        m = MagicMock()
        m.json = ujson.loads(CAMPAIGN_OBJ_BASE_BID)
        self.d.console.get.return_value = m
        max_bid = self.d.get_max_bid("sample_campaign")

        self.assertTrue(math.isnan(max_bid))


    def test_check_params_all_correct(self):
        
        # param dictionary all correct
        params = deepcopy(PARAMS)
        self.d.check_params(params)

    def test_check_params_missing_vals(self):
        
        # param dictionary missing values
        params = deepcopy(PARAMS)
        del params['learn_total_imps_limit']
        with self.assertRaises(ValueError):
            self.d.check_params(params)


    def test_check_params_incorrect_type(self):
        
        # learn_total_imps_limit
        params = deepcopy(PARAMS)
        params['learn_total_imps_limit'] = float(params['learn_total_imps_limit'])
        with self.assertRaises(TypeError):
            self.d.check_params(params)

        # learn_daily_imps_limit
        params = deepcopy(PARAMS)
        params['learn_daily_imps_limit'] = str(params['learn_daily_imps_limit'])
        with self.assertRaises(TypeError):
            self.d.check_params(params)

        # learn_daily_cpm_limit
        params = deepcopy(PARAMS)
        params['learn_daily_cpm_limit'] = str(params['learn_daily_cpm_limit'])
        with self.assertRaises(TypeError):
            self.d.check_params(params)

        # learn_max_bid_limit
        params = deepcopy(PARAMS)
        params['learn_max_bid_limit'] = str(params['learn_max_bid_limit'])
        with self.assertRaises(TypeError):
            self.d.check_params(params)

