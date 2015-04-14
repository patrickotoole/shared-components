import pandas as pd
import unittest
import sys
sys.path.append("../../")
from placement_opt import PlacementDataSource
from copy import deepcopy
import mock
from mock import MagicMock


EX_ADV_ID = 338195
EX_CAMPAIGNS = [7320174]

'''
##########################################################################################################################################################################################
Fixtures:
##########################################################################################################################################################################################
'''

REPORT = """
{ 
    "report": { 
        "report_type":"advertiser_analytics", 
        "columns": [ 
            "hour",
            "day",
            "seller_member", 
            "placement_id", 
            "campaign_id", 
            "imps", 
            "clicks", 
            "total_convs",
            "media_cost",
            "total_revenue"
        ], 
         "start_date": "%(start_date)s",
        "end_date": "%(end_date)s", 
        "format":"csv" 
    } 
}
"""

FIXTURE1 = pd.DataFrame([
        {

            'imps': 1000, 
            'hour': "10", 
            'total_convs': 10, 
            'total_revenue': 100., 
            'placement_id': 1243, 
            'campaign_id': 7320174, 
            'clicks': 50, 
            'media_cost': 100., 
            'seller_member': "", 
            'day':  "2015-03-03"
        },
        {

            'imps': 1000, 
            'hour': "10", 
            'total_convs': 10, 
            'total_revenue': 100., 
            'placement_id': 1243, 
            'campaign_id': 7320174, 
            'clicks': 50, 
            'media_cost': 100., 
            'seller_member': "", 
            'day':  "2015-03-04"
        }
        ])

FIXTURE_BAD_DAY_STR = pd.DataFrame([
        {

            'imps': 1000, 
            'hour': "10", 
            'total_convs': 10, 
            'total_revenue': 100., 
            'placement_id': 1243, 
            'campaign_id': 7320174, 
            'clicks': 50, 
            'media_cost': 100., 
            'seller_member': "", 
            'day':  "2015-033-03"
        }])

FIXTURE_EMPTY_DF = pd.DataFrame(columns = ["imps","hour"])

FIXTURE_DF = { 'placement_id': 1273,
                'last_served_date': "2015-03-04",
                'num_days': 2,
                'imps_served': 2000,
                'convs': 0,
                'clicks': 100,
                'media_cost': 4,
                'revenue': 0,
                'profit': -4
            }

FIXTURE_PARAM = {'RPA_multipliers':[1,2,3], 'loss_limits':[1,2,3],
                    'RPA': 2, 'imp_served_cutoff':1000, 'CTR_cutoff':.004}



'''
##########################################################################################################################################################################################
Testing:
##########################################################################################################################################################################################
'''
from link import lnk

class PlacementDataSourceTest(unittest.TestCase):
    
    def setUp(self):
        self.d = PlacementDataSource(EX_ADV_ID, EX_CAMPAIGNS)
        lnk.api = mock.MagicMock()

    def tearDown(self):
        pass

    def test_report_bad_date_strings(self):
        with self.assertRaises(ValueError):
            self.d.pull("15-4-4", "2015-04-04")


    def test_report_bad_report_call(self):
        self.d.reporting_api.get_report.side_effect = Exception

        with self.assertRaises(Exception):
            self.d.pull("2015-04-04", "2015-04-04")


    def test_reshape_none(self):
        self.d.data = None

        with self.assertRaises(Exception):
            self.d.reshape(EX_CAMPAIGNS[0])

    def test_reshape_emptyDF(self):
        
        self.d.data = FIXTURE_EMPTY_DF

        with self.assertRaises(TypeError):
            self.d.reshape(EX_CAMPAIGNS[0])

    def test_reshape_datestring_format(self):

        self.d.data = FIXTURE_BAD_DAY_STR

        with self.assertRaises(ValueError):
            self.d.reshape(EX_CAMPAIGNS[0]) 


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

        grouped_fixture = FIXTURE1.groupby('placement_id')
        
        actual = self.d.aggregrate_all(grouped_fixture)

        self.assertEqual(expected.to_dict(), actual.to_dict())


    def test_transform_params_types(self):

        with self.assertRaises(ValueError):
            self.d.transform({})

        params = FIXTURE_PARAM.copy()
        params['loss_limits'] = []
        with self.assertRaises(ValueError):
            self.d.transform( params )

        params = FIXTURE_PARAM.copy()
        params['RPA_multipliers'] = [1,2]
        with self.assertRaises(ValueError):
            self.d.transform( params )

        params = FIXTURE_PARAM.copy()
        params['loss_limits'] = [1,2]
        with self.assertRaises(ValueError):
            self.d.transform( params )

        params = FIXTURE_PARAM.copy()
        params['RPA_multipliers'] = [1,"2",3]
        with self.assertRaises(TypeError):
            self.d.transform( params )

        params = FIXTURE_PARAM.copy()
        params['loss_limits'] = ["1",2,3]
        with self.assertRaises(TypeError):
            self.d.transform( params )

        params = FIXTURE_PARAM.copy()
        params['RPA'] = "2"
        with self.assertRaises(TypeError):
            self.d.transform( params )

        params = FIXTURE_PARAM.copy()
        params['imp_served_cutoff'] = "1000"  
        with self.assertRaises(TypeError):
            self.d.transform( params )

        params = FIXTURE_PARAM.copy()
        params['CTR_cutoff'] = ".004" 
        with self.assertRaises(TypeError):
            self.d.transform( params)


    def test_transform_df_param_negative(self):
        
        params = FIXTURE_PARAM.copy()
        params['CTR_cutoff'] = -.004
        with self.assertRaises(AttributeError):
            self.d.transform( params )

        params = FIXTURE_PARAM.copy()
        params['imp_served_cutoff'] = -1000
        with self.assertRaises(AttributeError):
            self.d.transform( params )

    def test_transform_check_df(self):

        self.d.df = pd.DataFrame([FIXTURE_DF]).set_index('placement_id')

        expected = deepcopy(FIXTURE_DF)
        expected['CTR'] = 0.05
        expected['RPA'] = FIXTURE_PARAM['RPA']
        expected['loss_limit'] = 1
        expected['RPA_multiplier'] = 1
        expected['imp_served_cutoff'] = FIXTURE_PARAM['imp_served_cutoff']
        expected['CTR_cutoff'] = FIXTURE_PARAM['CTR_cutoff']

        expected = pd.DataFrame( [expected] ).set_index('placement_id')

        self.d.transform( FIXTURE_PARAM )

        actual = self.d.df

        self.assertEqual(expected.to_dict(), actual.to_dict())


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

        actual = self.d.df

        self.assertEqual(expected.to_dict(), actual.to_dict())




