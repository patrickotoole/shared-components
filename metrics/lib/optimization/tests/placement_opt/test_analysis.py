import pandas as pd
import unittest
import sys
sys.path.append("../../")
from placement_opt import PlacementAnalysis

import mock
from mock import MagicMock
import ujson
from copy import deepcopy
from test_analysis_fixtures import *
# Fixtures


'''
##########################################################################################################################################################################################
Testing:
##########################################################################################################################################################################################
'''

from link import lnk

class PlacementAnalysisTest(unittest.TestCase):
    
    def setUp(self):
        self.d = PlacementAnalysis(DF)
        lnk.api = mock.MagicMock()

    def tearDown(self):
        pass

    def test_find_placements_no_conv_placement_unprofitable(self):

        row_false = {'convs': 0, 'profit': -10, 'RPA': 10, 'loss_limit': 50, 
                    'RPA_multiplier': 1 }
        actual = self.d.find_no_conv_placement_unprofitable(row_false)
        self.assertEqual(False, actual)

    def test_find_placements_one_conv_placement_unprofitable(self):
        row_false = {'convs': 1, 'profit': -10, 'RPA': 10, 'loss_limit': 50, 
                    'RPA_multiplier': 1 }
        actual = self.d.find_one_conv_placement_unprofitable(row_false)
        self.assertEqual(False, actual)


    def test_find_placements_multi_conv_placement_unprofitable(self):
        row_false = {'convs': 2, 'profit': -10, 'RPA': 10, 'loss_limit': 50, 
                    'RPA_multiplier': 1 }
        actual = self.d.find_one_conv_placement_unprofitable(row_false)
        self.assertEqual(False, actual)

    def test_find_placements_no_conv_placement_clickfraud(self):
        row_false = {'convs': 0, 'CTR': 0.05, 'CTR_cutoff': 0.04, 'imps_served': 100, 'imp_served_cutoff':50 }
        actual = self.d.find_one_conv_placement_unprofitable(row_false)
        self.assertEqual(False, actual)


    def test_add_rule_group_ids_real_rules(self):
        '''
        Testing for good rule group names
        '''

        self.d.placement_rules = deepcopy(PLACEMENT_RULE_MISSING_GROUP_ID)
        
        m = MagicMock()
        m.json = ujson.loads(GOOD_RULE_GROUP_RESPONSE)
        self.d.rbox_api.get.return_value = m

        self.d.add_rule_group_ids()
        for rule in self.d.placement_rules.keys():
            self.assertTrue(self.d.placement_rules[rule]['rule_group_id'])

    def test_add_rule_group_ids_fake_rules(self):
        '''
        Testing for bad rule group names
        '''

        self.d.placement_rules = deepcopy(PLACEMENT_RULE_MISSING_GROUP_ID)

        m = MagicMock()
        m.json = []

        self.d.rbox_api.get.return_value = m

        with self.assertRaises(IndexError):
            self.d.add_rule_group_ids()


    def test_reshape_missing_group_id(self):

        self.d.placement_rules = deepcopy(PLACEMENT_RULE_MISSING_GROUP_ID)
        
        with self.assertRaises(AttributeError):
            self.d.reshape()


    def test_reshape_missing_placement(self):

        self.d.placement_rules = deepcopy(PLACEMENT_RULE_WITH_PLACEMENTS)
        
        with self.assertRaises(AttributeError):
            self.d.reshape()







