import pandas as pd
import unittest
import sys
sys.path.append("../../")
from placement_opt import PlacementDataSource
from copy import deepcopy
import mock
from mock import MagicMock
from test_datasource_fixtures import *

EX_ADV_ID = 338195
EX_CAMPAIGNS = [7320174]
ADVERTISER = "bigstock"

from link import lnk

class PlacementDataSourceTest(unittest.TestCase):
    
    def setUp(self):
        self.d = PlacementDataSource(EX_ADV_ID, ADVERTISER, EX_CAMPAIGNS)
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

        expected = pd.DataFrame( [{ 'placement_id': 1243,
                                    'last_served_date': "2015-03-04",
                                    'num_days': 2,
                                    'imps_served': 2000,
                                    'convs': 20,
                                    'clicks': 100,
                                    'media_cost': 200,
                                    'revenue': 200,
                                    'profit': 0
                                    }] ).set_index('placement_id')

        grouped_fixture = FIXTURE_APNX_DATA_GOOD.groupby('placement_id')
        
        actual = self.d.aggregrate_all(grouped_fixture)

        self.assertEqual(expected.to_dict(), actual.to_dict())


    def test_reformat_cols(self):
        # Here
        pass


    def test_reshape_apnx_data_none(self):
        self.d.apnx_data = None
        self.d.rbox_data = FIXTURE_RBOX_GOOD

        with self.assertRaises(Exception):
            self.d.reshape(EX_CAMPAIGNS[0])

    def test_reshape_apnx_data_emptyDF(self):
        
        self.d.apnx_data = FIXTURE_APNX_DATA_EMPTY_DF
        self.d.rbox_data = FIXTURE_RBOX_GOOD

        with self.assertRaises(TypeError):
            self.d.reshape(EX_CAMPAIGNS[0])

    def test_reshape_apnx_data_datestring_format(self):

        self.d.apnx_data = FIXTURE_APNX_DATA_BAD_DAY_STR
        self.d.rbox_data = FIXTURE_RBOX_GOOD

        with self.assertRaises(ValueError):
            self.d.reshape(EX_CAMPAIGNS[0]) 

    def test_reshape_merge(self):

        self.d.rbox_data = FIXTURE_RBOX_GOOD
        self.d.apnx_data = FIXTURE_APNX_DATA_GOOD

        self.d.reshape(EX_CAMPAIGNS[0])
        
        self.assertEqual(self.d.df.to_dict(), FIXTURE_MERGED_DF.to_dict())


    def test_check_params_types(self):
        # Here
        with self.assertRaises(ValueError):
            self.d.check_params({})

        params = FIXTURE_PARAM.copy()
        params['loss_limits'] = []
        with self.assertRaises(ValueError):
            self.d.check_params( params )

        params = FIXTURE_PARAM.copy()
        params['RPA_multipliers'] = [1,2]
        with self.assertRaises(ValueError):
            self.d.check_params( params )

        params = FIXTURE_PARAM.copy()
        params['loss_limits'] = [1,2]
        with self.assertRaises(ValueError):
            self.d.check_params( params )

        params = FIXTURE_PARAM.copy()
        params['RPA_multipliers'] = [1,"2",3]

        with self.assertRaises(TypeError):
            self.d.check_params( params )

        params = FIXTURE_PARAM.copy()
        params['loss_limits'] = ["1",2,3]
        with self.assertRaises(TypeError):
            self.d.check_params( params )

        params = FIXTURE_PARAM.copy()
        params['RPA'] = "2"
        with self.assertRaises(TypeError):
            self.d.check_params( params )

        params = FIXTURE_PARAM.copy()
        params['imps_served_cutoff'] = "1000"  
        with self.assertRaises(TypeError):
            self.d.check_params( params )

        params = FIXTURE_PARAM.copy()
        params['CTR_cutoff'] = ".004" 
        with self.assertRaises(TypeError):
            self.d.check_params( params)


    def check_params_negative(self):

        params = FIXTURE_PARAM.copy()
        params['CTR_cutoff'] = -.004
        with self.assertRaises(AttributeError):
            self.d.check_params( params )

        params = FIXTURE_PARAM.copy()
        params['imps_served_cutoff'] = -1000
        with self.assertRaises(AttributeError):
            self.d.check_params( params )

        params = FIXTURE_PARAM.copy()
        params['served_ratio_cutoff'] = -1000
        with self.assertRaises(AttributeError):
            self.d.check_params( params )

        params = FIXTURE_PARAM.copy()
        params['loaded_ratio_cutoff'] = -1000
        with self.assertRaises(AttributeError):
            self.d.check_params( params )



    def test_transform_check_df(self):


        expected = FIXTURE_MERGED_DF
        expected['CTR'] = 0.05
        expected['RPA'] = FIXTURE_PARAM['RPA']
        expected['loss_limit'] = 1
        expected['RPA_multiplier'] = 1
        expected['imps_served_cutoff'] = FIXTURE_PARAM['imps_served_cutoff']
        expected['CTR_cutoff'] = FIXTURE_PARAM['CTR_cutoff']
        
        expected['loaded_ratio'] = expected['loaded'] / expected['imps_served_rbox'].astype(float)
        expected['apnx_rbox_served_ratio'] = expected['imps_served_rbox'] / expected['imps_served_apnx'].astype(float)
        expected['served_ratio_cutoff'] = FIXTURE_PARAM['served_ratio_cutoff']
        expected['loaded_ratio_cutoff'] = FIXTURE_PARAM['loaded_ratio_cutoff']


        self.d.df = FIXTURE_MERGED_DF

        self.d.transform(FIXTURE_PARAM)

        self.assertEqual(expected.to_dict(), self.d.df.to_dict())

    def test_filter(self):
        expected = pd.DataFrame([ { 'placement_id': 1243,
                                    'last_served_date': "2015-03-05",
                                    'num_days': 2,
                                    'imps_served': 2000,
                                    'convs': 20,
                                    'clicks': 100,
                                    'media_cost': 200,
                                    'revenue': 200,
                                    'profit': 0 } ] ).set_index('placement_id')

        self.d.end_date = "2015-03-05"

        self.d.df = pd.DataFrame([ {'placement_id': 1273,
                                    'last_served_date': "2015-03-04",
                                    'num_days': 2,
                                    'imps_served': 2000,
                                    'convs': 20,
                                    'clicks': 100,
                                    'media_cost': 200,
                                    'revenue': 200,
                                    'profit': 0
                                    },
                                    { 'placement_id': 1243,
                                    'last_served_date': "2015-03-05",
                                    'num_days': 2,
                                    'imps_served': 2000,
                                    'convs': 20,
                                    'clicks': 100,
                                    'media_cost': 200,
                                    'revenue': 200,
                                    'profit': 0
                                    }] ).set_index('placement_id')
        self.d.filter()

        self.assertEqual(expected.to_dict(), self.d.df.to_dict())




