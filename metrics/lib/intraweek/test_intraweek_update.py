import mock
import unittest
import pandas
from intraweek_update import *
from link import lnk
from pandas.util.testing import assert_frame_equal

class NewObject(object):
    def df_charges(self):
        return 0

class IntraWeekTestCase(unittest.TestCase):

    def setUp(self):
        # some standard data/object to be used
        self.intraweek = NewObject()
        self.iw = Intraweek(lnk.dbs.vluu_local)
        self.before_charges = DataFrame(data={'impressions':[79, 207, 727],
                                      'clicks':[1, 2, 3],
                                      'media_cost':[1000, 1500, 500],
                                      'charged_client':[2000.0, 1500, 500],
                                      'cpm_multiplier':[2.0, 1, 1]},
                                      index=[201425, 201426, 201427])

        self.expect_conversions_1 = DataFrame(data={
                                      'Signup conversions':[652, 851, 338],
                                      'wk_no':[201425, 201426, 201427] })
        self.expect_conversions_2 = DataFrame(data={
                                      'Purchase conversions':[15, 59, 34],
                                      'wk_no':[201425, 201426, 201427] })
        self.expect_conversions_1 = self.expect_conversions_1.set_index('wk_no')
        self.expect_conversions_2 = self.expect_conversions_2.set_index('wk_no')


    def test_manipulate_success(self):
        """
        Describe what were testing
        """
        v = pandas.DataFrame()
        with mock.patch.object(self.intraweek, "df_charges") as m:
            # force the return value
            m.return_value = v
            result = self.intraweek.df_charges()

        self.assertTrue(result is v)
        
    def test_bad_pull_charges(self):
        """
        Make sure that pulling from an invalid advertiser_id -> small table
        """

        pulled_df = self.iw.pull_charges(100000)
        null_df = pandas.DataFrame(columns=['wk_no', 'impressions','clicks','media_cost', 'charged_client', 'cpm_multiplier'])
        null_df = null_df.set_index('wk_no')

        print pulled_df
        print null_df

        assert_frame_equal(pulled_df, null_df)

    def test_bad_pull_conversions(self):
        """
        Make sure that pulling from an invalid advertiser_id -> 0-row table
        """

        pulled_df = self.iw.pull_conversions(100000)
        null_df = pandas.DataFrame(columns=['wk_no', 'pixel_id','num_conversions'])

        print pulled_df
        print null_df

        assert_frame_equal(pulled_df, null_df)

    def test_fill_historical_cpm_all(self):
        """
        test fill_historical_cpm, all historical cpms are NaN
        """
       
        # based on square data
        NaN = float('nan') 
        before_df_1 = DataFrame(data={'impressions':[79, 207, 727], 
                                      'clicks':[1, 2, 3],
                                      'media_cost':[1170, 1708, 597],
                                      'charged_client':[NaN, NaN, NaN],
                                      'cpm_multiplier':[NaN, NaN, NaN]}, 
                                      index=[201425, 201426, 201427]) 
        after_df_1 = self.iw.fill_historical_cpm(before_df_1)
        expect_df_1 = DataFrame(data={'impressions':[79, 207, 727],
                                      'clicks':[1, 2, 3],
                                      'media_cost':[1170, 1708, 597],
                                      'charged_client':[1170.0, 1708, 597],
                                      'cpm_multiplier':[1.0, 1, 1]}, 
                                      index=[201425, 201426, 201427]) 

        assert_frame_equal(after_df_1, expect_df_1)

    def test_fill_historical_cpm_none(self):
        """
        test fill_historical_cpm, none of the historical cpms are NaN
        """

        # based on square data
        NaN = float('nan')

        before_df_2 = DataFrame(data={'impressions':[79, 207, 727], 
                                      'clicks':[1, 2, 3],
                                      'media_cost':[1000, 1500, 500],
                                      'charged_client':[1500.0, 3000, 1000 ],
                                      'cpm_multiplier':[1.5, 2, 2]}, 
                                      index=[201425, 201426, 201427]) 
        after_df_2 = self.iw.fill_historical_cpm(before_df_2)
        expect_df_2 = DataFrame(data={'impressions':[79, 207, 727],
                                      'clicks':[1, 2, 3],
                                      'media_cost':[1000, 1500, 500],
                                      'charged_client':[1500.0, 3000, 1000 ],
                                      'cpm_multiplier':[1.5, 2, 2]}, 
                                      index=[201425, 201426, 201427]) 

        assert_frame_equal(after_df_2, expect_df_2)

    def test_fill_historical_cpm_mixed(self):
        """
        test fill_historical_cpm, only one of the historical cpms are NaN
        """

        # based on square data
        NaN = float('nan')

        before_df_3 = DataFrame(data={'impressions':[79, 207, 727], 
                                      'clicks':[1, 2, 3],
                                      'media_cost':[1000, 1500, 500],
                                      'charged_client':[2000.0, 1500, NaN],
                                      'cpm_multiplier':[2, 1, NaN]}, 
                                      index=[201425, 201426, 201427]) 
        after_df_3 = self.iw.fill_historical_cpm(before_df_3)
        expect_df_3 = DataFrame(data={'impressions':[79, 207, 727],
                                      'clicks':[1, 2, 3],
                                      'media_cost':[1000, 1500, 500],
                                      'charged_client':[2000.0, 1500, 500],
                                      'cpm_multiplier':[2.0, 1, 1]}, 
                                      index=[201425, 201426, 201427]) 

        assert_frame_equal(after_df_3, expect_df_3)

    def test_make_weight_lists_one(self):
        """
        test make_weight_lists, for just one type of cpm
        """
        
        before_charges = DataFrame(data={'impressions':[79, 207, 727],
                                      'clicks':[1, 2, 3],
                                      'media_cost':[1000, 1500, 500],
                                      'charged_client':[2000.0, 1500, 500],
                                      'cpm_multiplier':[2.0, 1, 1]},
                                      index=[201425, 201426, 201427])      

        before_conversions = DataFrame(data={'pixel_id':[128793, 128793, 128793],
                                      'num_conversions':[44, 59, 13],
                                      'wk_no':[201425, 201426, 201427]}) 

        after_tuple = self.iw.make_weight_lists(before_charges, before_conversions)

        expect_conversions = DataFrame(data={
                                      'Purchase conversions':[44, 59, 13],
                                      'wk_no':[201425, 201426, 201427] })
        expect_conversions = expect_conversions.set_index('wk_no')       

        assert_frame_equal(after_tuple[0][0], before_charges)
        assert_frame_equal(after_tuple[0][1], expect_conversions)
        self.assertTrue(after_tuple[1] == [1])

    def test_make_weight_lists_two(self):
        """
        test make_weight_lists, for two types of conversions
        """

        before_conversions = DataFrame(data={'pixel_id':[176402, 179032, 176402, 179032, 176402, 179032],
                                      'num_conversions':[15, 652, 59, 851, 34, 338],
                                      'wk_no':[201425, 201425, 201426, 201426, 201427, 201427]})     

        after_tuple = self.iw.make_weight_lists(self.before_charges, before_conversions)

        assert_frame_equal(after_tuple[0][0], self.before_charges)
        assert_frame_equal(after_tuple[0][1], self.expect_conversions_1)
        assert_frame_equal(after_tuple[0][2], self.expect_conversions_2)

        self.assertTrue(after_tuple[1] == [0.05, 1])

    def test_add_num_conversions(self):
        """
        tests add_num_conversions - with two types of conversion events
        """

        before_tuple = (self.before_charges, self.expect_conversions_1, self.expect_conversions_2)
        after_df_full = self.iw.add_num_conversions(before_tuple, (0.05, 1))

        print after_df_full

        expect_charges = DataFrame(data={'impressions':[79, 207, 727],
                                      'clicks':[1, 2, 3],
                                      'media_cost':[1000, 1500, 500],
                                      'charged_client':[2000.0, 1500, 500],
                                      'cpm_multiplier':[2.0, 1, 1],
                                      'Signup conversions':[652, 851, 338],
                                      'Purchase conversions':[15, 59, 34],
                                      'num_conversions':[47.6, 101.55, 50.90]},
                                      index=[201425, 201426, 201427])

        expect_charges = expect_charges[['charged_client', 'clicks', 'cpm_multiplier','impressions','media_cost','Signup conversions','Purchase conversions','num_conversions']] 
        assert_frame_equal(after_df_full, expect_charges)

    def test_add_cpm_columns_twoaverage(self):
        """
        test add_cpm_columns - averaging past two weeks
        """

        before_df_full = DataFrame(data={'impressions':[2739883, 3792033, 1647689],
                                      'clicks':[1931, 2178, 921],
                                      'media_cost':[2284.206815, 2856.217544, 1209.099372],
                                      'charged_client':[2558.311633, 3027.590597, 1209.099372],
                                      'cpm_multiplier':[1.12, 1.06, 1.00],
                                      'Signup conversions':[652, 851, 338],
                                      'Purchase conversions':[15, 59, 34],
                                      'num_conversions':[47.6, 101.55, 50.90]},
                                      index=[201425, 201426, 201427])

        after_df_full = self.iw.add_cpm_columns(before_df_full, -1)

        expect_df_full = DataFrame(data={'impressions':[2739883, 3792033, 1647689],
                                      'clicks':[1931, 2178, 921],
                                      'media_cost':[2284.206815, 2856.217544, 1209.099372],
                                      'charged_client':[2558.311633, 3027.590597, 1209.099372],
                                      'cpm_multiplier':[1.12, 1.06, 1.00],
                                      'Signup conversions':[652, 851, 338],
                                      'Purchase conversions':[15, 59, 34],
                                      'num_conversions':[47.6, 101.55, 50.90],
                                      'cpa':[47.987548, 28.126219, 23.754408],
                                      'cpa_charged':[53.746043, 29.813792, 41.779917],
                                      'cpm':[0.833688, 0.753215, 0.733815],
                                      'cpm_charged':[0.933730, 0.798408, 1.290655],
                                      'multiplier':[1.12, 1.06, 1.721184]},
                                      index=[201425, 201426, 201427])

        expect_df_full = expect_df_full[['Purchase conversions', 'Signup conversions', 'charged_client', 'clicks', 'cpm_multiplier','impressions','media_cost','num_conversions','cpa', 'cpa_charged', 'cpm', 'cpm_charged']] 
        
        print after_df_full
        print expect_df_full

        assert_frame_equal(after_df_full, expect_df_full)

    def test_add_cpm_columns_threeaverage(self):
        """
        test add_cpm_columns - averaging past three weeks
        """

        before_df_full = DataFrame(data={'impressions':[2450993, 2739883, 3792033, 1647689],
                                      'clicks':[1618, 1931, 2178, 921],
                                      'media_cost':[1543.15904, 2284.206815, 2856.217544, 1209.099372],
                                      'charged_client':[2036.970413, 2558.311633, 3027.590597, 1209.099372],
                                      'cpm_multiplier':[1.32, 1.12, 1.06, 1.00],
                                      'Signup conversions':[522, 652, 851, 338],
                                      'Purchase conversions':[26, 15, 59, 34],
                                      'num_conversions':[52.10, 47.6, 101.55, 50.90]},
                                      index=[201424, 201425, 201426, 201427])

        after_df_full = self.iw.add_cpm_columns(before_df_full, -1)

        expect_df_full = DataFrame(data={'impressions':[2450993, 2739883, 3792033, 1647689],
                                      'clicks':[1618, 1931, 2178, 921],
                                      'media_cost':[1543.15904, 2284.206815, 2856.217544, 1209.099372],
                                      'charged_client':[2036.970413, 2558.311633, 3027.590597, 1209.099372],
                                      'cpm_multiplier':[1.32, 1.12, 1.06, 1.00],
                                      'Signup conversions':[522, 652, 851, 338],
                                      'Purchase conversions':[26, 15, 59, 34],
                                      'num_conversions':[52.10, 47.6, 101.55, 50.90],
                                      'cpa':[29.619182, 47.987548, 28.126219, 23.754408],
                                      'cpa_charged':[39.097321, 53.746043, 29.813792, 40.885719],
                                      'cpm':[0.629606, 0.833688, 0.753215, 0.733815],
                                      'cpm_charged':[0.831080, 0.933730, 0.798408, 1.263031]},
                                      index=[201424,201425, 201426, 201427])

        expect_df_full = expect_df_full[['Purchase conversions', 'Signup conversions', 'charged_client', 'clicks', 'cpm_multiplier','impressions','media_cost','num_conversions','cpa', 'cpa_charged', 'cpm', 'cpm_charged']] 

        print after_df_full
        print expect_df_full

        assert_frame_equal(after_df_full, expect_df_full)
    
    def test_add_cpm_columns_fixedcpa(self):
        """
        test add_cpm_columns - with fixed cpa_target
        """
        
        before_df_full = DataFrame(data={'impressions':[2450993, 2739883, 3792033, 1647689],
                                      'clicks':[1618, 1931, 2178, 921],
                                      'media_cost':[1543.15904, 2284.206815, 2856.217544, 1209.099372],
                                      'charged_client':[2036.970413, 2558.311633, 3027.590597, 1209.099372],
                                      'cpm_multiplier':[1.32, 1.12, 1.06, 1.00],
                                      'Signup conversions':[522, 652, 851, 338],
                                      'Purchase conversions':[26, 15, 59, 34],
                                      'num_conversions':[52.10, 47.6, 101.55, 50.90]},
                                      index=[201424, 201425, 201426, 201427])
                                      
        after_df_full = self.iw.add_cpm_columns(before_df_full, 50)

        expect_df_full = DataFrame(data={'impressions':[2450993, 2739883, 3792033, 1647689],
                                      'clicks':[1618, 1931, 2178, 921],
                                      'media_cost':[1543.15904, 2284.206815, 2856.217544, 1209.099372],
                                      'charged_client':[2036.970413, 2558.311633, 3027.590597, 1209.099372],
                                      'cpm_multiplier':[1.32, 1.12, 1.06, 1.00],
                                      'Signup conversions':[522, 652, 851, 338],
                                      'Purchase conversions':[26, 15, 59, 34],
                                      'num_conversions':[52.10, 47.6, 101.55, 50.90],
                                      'cpa':[29.619182, 47.987548, 28.126219, 23.754408],
                                      'cpa_charged':[39.097321, 53.746043, 29.813792, 50],
                                      'cpm':[0.629606, 0.833688, 0.753215, 0.733815],
                                      'cpm_charged':[0.831080, 0.933730, 0.798408, 1.544588]},
                                      index=[201424,201425, 201426, 201427])


        expect_df_full = expect_df_full[['Purchase conversions', 'Signup conversions', 'charged_client', 'clicks', 'cpm_multiplier','impressions','media_cost','num_conversions','cpa', 'cpa_charged', 'cpm', 'cpm_charged']] 

        print after_df_full
        print expect_df_full
        
        assert_frame_equal(after_df_full, expect_df_full)

    def test_adjust_charge_client_normal(self):
        """
        test adjust_charge_client - normal case, get the correct multiplier
        """

        before_df_full = DataFrame(data={'impressions':[2450993, 2739883, 3792033, 1647689],
                                      'clicks':[1618, 1931, 2178, 921],
                                      'media_cost':[1543.15904, 2284.206815, 2856.217544, 1209.099372],
                                      'charged_client':[2036.970413, 2558.311633, 3027.590597, 1209.099372],
                                      'cpm_multiplier':[1.32, 1.12, 1.06, 1.00],
                                      'Signup conversions':[522, 652, 851, 338],
                                      'Purchase conversions':[26, 15, 59, 34],
                                      'num_conversions':[52.10, 47.6, 101.55, 50.90],
                                      'cpa':[29.619182, 47.987548, 28.126219, 23.754408],
                                      'cpa_charged':[39.097321, 53.746043, 29.813792, 50],
                                      'cpm':[0.629606, 0.833688, 0.753215, 0.733815],
                                      'cpm_charged':[0.831080, 0.933730, 0.798408, 1.544588]},
                                      index=[201424,201425, 201426, 201427])
 
        after_df_full = self.iw.adjust_charge_client(before_df_full)

        expect_df_full = DataFrame(data={'impressions':[2450993, 2739883, 3792033, 1647689],
                                      'clicks':[1618, 1931, 2178, 921],
                                      'media_cost':[1543.15904, 2284.206815, 2856.217544, 1209.099372],
                                      'charged_client':[2036.970413, 2558.311633, 3027.590597, 2545.000000],
                                      'cpm_multiplier':[1.32, 1.12, 1.06, 1.00],
                                      'Signup conversions':[522, 652, 851, 338],
                                      'Purchase conversions':[26, 15, 59, 34],
                                      'num_conversions':[52.10, 47.6, 101.55, 50.90],
                                      'cpa':[29.619182, 47.987548, 28.126219, 23.754408],
                                      'cpa_charged':[39.097321, 53.746043, 29.813792, 50],
                                      'cpm':[0.629606, 0.833688, 0.753215, 0.733815],
                                      'cpm_charged':[0.831080, 0.933730, 0.798408, 1.544588],
                                      'multiplier':[1.32, 1.12, 1.06, 2.104872]},
                                      index=[201424,201425, 201426, 201427]) 
        
        expect_df_full = expect_df_full[['Purchase conversions', 'Signup conversions', 'charged_client', 'clicks', 'cpa', 'cpa_charged', 'cpm', 'cpm_charged', 'cpm_multiplier','impressions','media_cost','num_conversions', 'multiplier']]

        print after_df_full
        print expect_df_full

        assert_frame_equal(after_df_full, expect_df_full)

    def test_adjust_charge_client_noconversions(self):
        """
        test adjust_charge_client - when num_conversions is still 0
        """

        before_df_full = DataFrame(data={'impressions':[2450993, 2739883, 3792033, 1647689],
                                      'clicks':[1618, 1931, 2178, 921],
                                      'media_cost':[1543.15904, 2284.206815, 2856.217544, 1209.099372],
                                      'charged_client':[2036.970413, 2558.311633, 3027.590597, float('nan')],
                                      'cpm_multiplier':[1.32, 1.12, 1.06, 1.00],
                                      'Signup conversions':[522, 652, 851, 0],
                                      'Purchase conversions':[26, 15, 59, 0],
                                      'num_conversions':[52.10, 47.6, 101.55, 0],
                                      'cpa':[29.619182, 47.987548, 28.126219, float('inf')],
                                      'cpa_charged':[39.097321, 53.746043, 29.813792, float('inf')],
                                      'cpm':[0.629606, 0.833688, 0.753215, 0.733815],
                                      'cpm_charged':[0.831080, 0.933730, 0.798408, float('nan')]},
                                      index=[201424,201425, 201426, 201427])

        after_df_full = self.iw.adjust_charge_client(before_df_full)

        expect_df_full = DataFrame(data={'impressions':[2450993, 2739883, 3792033, 1647689],
                                      'clicks':[1618, 1931, 2178, 921],
                                      'media_cost':[1543.15904, 2284.206815, 2856.217544, 1209.099372],
                                      'charged_client':[2036.970413, 2558.311633, 3027.590597, 1209.099372],
                                      'cpm_multiplier':[1.32, 1.12, 1.06, 1.00],
                                      'Signup conversions':[522, 652, 851, 0],
                                      'Purchase conversions':[26, 15, 59, 0],
                                      'num_conversions':[52.10, 47.6, 101.55, 0],
                                      'cpa':[29.619182, 47.987548, 28.126219, float('inf')],
                                      'cpa_charged':[39.097321, 53.746043, 29.813792, float('inf')],
                                      'cpm':[0.629606, 0.833688, 0.753215, 0.733815],
                                      'cpm_charged':[0.831080, 0.933730, 0.798408, 0.733815],
                                      'multiplier':[1.32, 1.12, 1.06, 1.0]},
                                      index=[201424,201425, 201426, 201427])

        expect_df_full = expect_df_full[['Purchase conversions', 'Signup conversions', 'charged_client', 'clicks', 'cpa', 'cpa_charged', 'cpm', 'cpm_charged', 'cpm_multiplier','impressions','media_cost','num_conversions', 'multiplier']]

        print after_df_full
        print expect_df_full

        assert_frame_equal(after_df_full, expect_df_full) 

    def test_finishing_formats(self):
        """
        tests finishing_formats - tests re-ordering of columns and yearweek inverting
        """

        before_df_full = DataFrame(data={'impressions':[79, 207, 727],
                                      'clicks':[1, 2, 3],
                                      'media_cost':[1000, 1500, 500],
                                      'charged_client':[2000.0, 1500, 500],
                                      'cpm_multiplier':[2.0, 1, 1],
                                      'Signup conversions':[652, 851, 338],
                                      'Purchase conversions':[15, 59, 34],
                                      'num_conversions':[47.6, 101.55, 50.90],
                                      'cpa':[50, 60, 70],
                                      'cpa_charged':[55, 65, 75],
                                      'cpm':[0.5, 0.6, 0.7],
                                      'cpm_charged':[0.55, 0.65, 0.75],
                                      'multiplier':[1.1, 1.15, 1.2],
                                      'wk_no':[201425, 201426, 201427]})
        before_df_full = before_df_full.set_index('wk_no')

        after_df_full = self.iw.finishing_formats(before_df_full)

        expect_df_full = DataFrame(data={'impressions':[79, 207, 727],
                                      'clicks':[1, 2, 3],
                                      'media_cost':[1000, 1500, 500],
                                      'charged_client':[2000.0, 1500, 500],
                                      'Signup conversions':[652, 851, 338],
                                      'Purchase conversions':[15, 59, 34],
                                      'cpa':[50, 60, 70],
                                      'cpa_charged':[55, 65, 75],
                                      'cpm':[0.5, 0.6, 0.7],
                                      'cpm_charged':[0.55, 0.65, 0.75],
                                      'multiplier':[1.1, 1.15, 1.2],
                                      'week_starting':['2014-06-22', '2014-06-29', '2014-07-06']})
        expect_df_full = expect_df_full.set_index('week_starting')
        expect_df_full = expect_df_full[['Purchase conversions', 'Signup conversions', 'charged_client', 'clicks', 'impressions', 'media_cost', 'multiplier', 'cpa', 'cpa_charged', 'cpm', 'cpm_charged']]

        assert_frame_equal(after_df_full, expect_df_full)

    def test_transform_columns(self):
        """
        tests transform_columns - making sure fields are being populated correctly
        """
        
        self.iw.current_spent = 12000.0
        self.iw.days_into_campaign = 10
        self.iw.current_budget = 15000.0
        self.iw.proposed_campaign_length = 50
        self.iw.days_into_campaign = 10
        self.iw.current_remaining = 3000
        
        self.iw.transform_columns()

        self.assertTrue(self.iw.dollars_per_day == 1200.0)
        self.assertTrue(self.iw.expected_campaign_length == 12.5)
        self.assertTrue(self.iw.shouldve_spent == 3000)
        self.assertTrue(self.iw.to_spend_per_day == 75) 


