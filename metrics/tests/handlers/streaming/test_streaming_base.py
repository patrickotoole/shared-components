import unittest
import pandas

import sys
import mock
import os
sys.path.append("../../")

import unittest
import metrics.handlers.streaming.streaming_base as base

from pandas.util.testing import assert_frame_equal
from link import lnk

class MaskHelpersCase(unittest.TestCase):

    def setUp(self):
        pass

    def test_x_in_y(self):
        pass

    def test_mask_data(self):
        pass

class BaseTestCase(unittest.TestCase):

    VALUES = {"creative":[1,2,3]*2,"other":[5]*5+[pandas.np.NaN],"auction_id":[1,2,3,4,5,6]}
    CREATIVE_DF = pandas.DataFrame({"id":[1,2,3],"brand":["1","2","3"]})
    STANDARD_DF = pandas.DataFrame(VALUES)

    def setUp(self):
        self.df = self.STANDARD_DF
      
        self.db = lnk.dbs.test
        self.db.select_dataframe = mock.MagicMock(return_value=self.CREATIVE_DF)

        self.base = base.StreamingBase()
        self.base.initialize(db=self.db)

    def test_creatives(self):
        assert_frame_equal(self.base.creatives, self.CREATIVE_DF)

    def test_merge_brand(self):
        merged = self.base.merge_brand(self.df)
        self.assertTrue("brand" in merged.columns)

    def test_build_basic(self):
        built = self.base.build_basic(self.VALUES)

        # testing brand, auction_id
        self.assertEqual(built.index.name,"auction_id")
        self.assertTrue("brand" in built.columns)
        
        _sorted = built[self.df.columns].sort()
        _set_index = self.df.set_index("auction_id",drop=False)

        # testing fill_na(0)
        df_equal = (_sorted == _set_index)
        self.assertEqual(df_equal.sum().sum(),17)


    def test_dict_columns(self):
        """
        add columns of dictionaries made from columns
        """
        column_dict = {
            "col1":["creative","auction_id"],
            "col2":["other","auction_id"]
        }
        with_dict_columns = self.base.dict_columns(self.df,column_dict)
        self.assertTrue("col1" in with_dict_columns.columns)
        self.assertTrue("col2" in with_dict_columns.columns)

        
        col1_df = pandas.DataFrame(with_dict_columns['col1'].tolist())
        col2_df = pandas.DataFrame(with_dict_columns['col2'].tolist())

        filled = sum(sum(self.df[column_dict["col2"]].values == col2_df[column_dict["col2"]].values))
        same = sum(sum(self.df[column_dict["col1"]].values == col1_df[column_dict["col1"]].values))

        self.assertEqual(filled,11)
        self.assertEqual(same,12)

    def test_build(self):
        """
        takes raw values and builds dataframe with shippable columns
        """
        pass

    def test_build_df(self):
        """
        takes name of buffer and runs build
        """
        pass

    def test_mask_select_convert(self):
        """
        the function
        1. masks the data frame for the specific clients mask dict
        2. chooses the columns to send
        3. converts to values to be sent
        """
        pass
