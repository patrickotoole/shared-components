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

    def test_fill_historical_cpm(self):
        """
        test fill_historical_cpm, make sure historical cpms work in
        """
       
        # based on square data 
        before_df_1 = DataFrame(data={'impressions':[79, 207, 727], 
                                        'clicks':[1, 2, 3],
                                        'media_cost':[1170, 1708, 597],
                                        'charged_client':[None, None, None],
                                        'cpm_multiplier':[None, None, None]}, 
                                        index=[201425, 201426, 201427]) 
        

