import pandas as pd
import unittest
import sys
sys.path.append("../../")
from ret_domain_opt import DomainDataSource
from copy import deepcopy
import mock
from mock import MagicMock
from test_datasource_fixtures import * 

EX_ADV_ID = 453991
EX_CAMPAIGNS = [7901540,7815718]
ADVERTISER = "twice"

from link import lnk

class DomainDataSourceTest(unittest.TestCase):
    
    def setUp(self):
        self.d = DomainDataSource(EX_ADV_ID, ADVERTISER, EX_CAMPAIGNS)
        lnk.api = mock.MagicMock()
        lnk.dbs = mock.MagicMock()

    def tearDown(self):
        pass

    def test_pull_apnx_data(self):
        
        self.d.start_date = "2015-04-05"
        self.d.end_date = "2015-04-07"
        self.d.reporting_api.get_report.side_effect = Exception

        with self.assertRaises(Exception):
            self.d.pull_apnx_data()

    def test_pull_rbox_data(self):
        self.d.start_date = "15-04-04"
        self.d.end_date = "15-04-04"
        self.d.hive.execute.side_effect = Exception

        with self.assertRaises(Exception):
            self.d.pull_rbox_data()

    def test_pull_bad_date_strings(self):
        with self.assertRaises(ValueError):
            self.d.pull("215-04-04", "2015-04-04")


    def test_aggregate_all(self):
        pass


    def test_reformat_cols(self):
        pass

    def test_reshape_None(self):

        self.d.apnx_data = None
        self.d.rbox_data = deepcopy(RBOX_DATA_FIXTURE)

        with self.assertRaises(Exception):
            self.d.reshape(EX_CAMPAIGNS[0])

        self.d.apnx_data = APNX_DATA_FIXTURE
        self.d.rbox_data = None

        with self.assertRaises(Exception):
            self.d.reshape(EX_CAMPAIGNS[0])


    def test_reshape_bad_col_types(self):
        
        self.d.rbox_data = pd.DataFrame(deepcopy(RBOX_DATA_FIXTURE))
        self.d.apnx_data = pd.DataFrame(deepcopy(APNX_DATA_FIXTURE))

        self.d.apnx_data['imps'] = self.d.apnx_data['imps'].astype(str)

        with self.assertRaises(TypeError):
            self.d.reshape(EX_CAMPAIGNS[0])

        self.d.rbox_data = pd.DataFrame(deepcopy(RBOX_DATA_FIXTURE))
        self.d.apnx_data = pd.DataFrame(deepcopy(APNX_DATA_FIXTURE))

        self.d.rbox_data['visible'] = self.d.rbox_data['visible'].astype(str)
        with self.assertRaises(TypeError):
            self.d.reshape(EX_CAMPAIGNS[0])

    def test_reshape_empty_dataframe(self):

        self.d.rbox_data = pd.DataFrame(deepcopy(RBOX_DATA_FIXTURE))
        self.d.apnx_data = pd.DataFrame(deepcopy(APNX_DATA_FIXTURE))

        self.d.apnx_data = self.d.apnx_data.drop(range(len(self.d.apnx_data)))
        
        with self.assertRaises(Exception):
            self.d.reshape(EX_CAMPAIGNS[0])

    def test_reshape_bad_day_string(self):

        self.d.rbox_data = pd.DataFrame(deepcopy(RBOX_DATA_FIXTURE))
        self.d.apnx_data = pd.DataFrame(deepcopy(APNX_DATA_FIXTURE))

        self.d.apnx_data['day'] = "day"

        with self.assertRaises(ValueError):
            self.d.reshape(EX_CAMPAIGNS[0])

    def test_reshape_corret(self):
        self.d.rbox_data = RBOX_DATA
        self.d.apnx_data = APNX_DATA

        expected = MERGED_DATA
        self.d.reshape(CAMPAIGN)
        actual = self.d.df

        # import ipdb
        # ipdb.set_trace()
        self.assertEqual(actual.to_dict(), expected.to_dict())



    def test_check_params(self):

        params = deepcopy(PARAM_FIXTURE)
        params['imps_served_cutoff'] = float(params['imps_served_cutoff'])
        with self.assertRaises(TypeError):
            self.d.check_params(params)

        params = deepcopy(PARAM_FIXTURE)
        params['imps_loaded_cutoff'] = float(params['imps_loaded_cutoff'])
        with self.assertRaises(TypeError):
            self.d.check_params(params)

        params = deepcopy(PARAM_FIXTURE)
        params['loaded_ratio_cutoff'] = int(params['loaded_ratio_cutoff'])
        with self.assertRaises(TypeError):
            self.d.check_params(params)

        params = deepcopy(PARAM_FIXTURE)
        params['visible_ratio_cutoff'] = int(params['visible_ratio_cutoff'])
        with self.assertRaises(TypeError):
            self.d.check_params(params)

        params = deepcopy(PARAM_FIXTURE)
        params['served_ratio_cutoff'] = int(params['served_ratio_cutoff'])
        with self.assertRaises(TypeError):
            self.d.check_params(params)

        # Passing in negative parameters
        params = deepcopy(PARAM_FIXTURE)
        params['served_ratio_cutoff'] = -1 * (params['served_ratio_cutoff'])
        with self.assertRaises(AttributeError):
            self.d.check_params(params)



    def test_filter(self):
        self.d.end_date = "2015-05-05"
        self.d.df  = FIXTURE_DF
        self.d.filter()
        self.assertEqual(self.d.df.to_dict(),FILTURED_DF.to_dict() )



