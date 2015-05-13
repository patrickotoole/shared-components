import pandas as pd
import unittest
import sys
sys.path.append("../../")
from prospecting_bid_opt import CampaignAnalysis
import numpy as np
import mock
from mock import MagicMock
import ujson
from copy import deepcopy

# from test_analysis_fixtures import *

GOOD_RULE_GROUP_RESPONSE = u'[{"active":1,"rule_group_id":69,"rule_group_name":"prosp_learn_bid_increase","rule":"%(imps_served_total)s <= %(learn_total_imps_limit)s","created":1431385462},{"active":1,"rule_group_id":69,"rule_group_name":"prosp_learn_bid_increase","rule":"%(imps_served_daily)s <= %(learn_daily_imps_limit)s","created":1431385462},{"active":1,"rule_group_id":69,"rule_group_name":"prosp_learn_bid_increase","rule":"%(CPM_daily)s <= %(learn_daily_cpm_limit)s","created":1431385462},{"active":1,"rule_group_id":69,"rule_group_name":"prosp_learn_bid_increase","rule":"%(max_bid)s <= %(learn_max_bid_limit)s","created":1431385462}]'


GOOD_OPT_RULES = {  'prosp_learn_bid_increase': 
                    {'action': 'INCREASE_MAX_BID', 
                    'metrics': [u'imps_served_total', u'learn_total_imps_limit', u'imps_served_daily', u'learn_daily_imps_limit', u'CPM_daily', u'learn_daily_cpm_limit', u'max_bid', u'learn_max_bid_limit'], 
                    'rule_group_id': 69, 
                    'conditions': ['%(imps_served_total)s <= %(learn_total_imps_limit)s', 
                                    '%(imps_served_daily)s <= %(learn_daily_imps_limit)s', 
                                    '%(CPM_daily)s <= %(learn_daily_cpm_limit)s', 
                                    '%(max_bid)s <= %(learn_max_bid_limit)s'
                                    ]
                    }
                }


ROW_DICT_TRUE = {   'imps_served_total': 1000,
                    'learn_total_imps_limit': 1000,
                    'learn_daily_imps_limit':1000,
                    'imps_served_daily': 100,
                    'CPM_daily': 2.0,
                    'learn_daily_cpm_limit': 3.0,
                    'max_bid' : 2.0,
                    'learn_max_bid_limit':8.0
                }

ROW_DICT_FALSE = {   'imps_served_total': 1000,
                    'learn_total_imps_limit': 1000,
                    'learn_daily_imps_limit':1000,
                    'imps_served_daily': 100,
                    'CPM_daily': 2.0,
                    'learn_daily_cpm_limit': 3.0,
                    'max_bid' : 2.0,
                    'learn_max_bid_limit':1.0
                }


ROW_DICT_MISSING = {    'loaded': 1000,
                        'imps_loaded_cutoff': 1000,
                        'visible_ratio': 0.2
                    }



FIXTURE_DF = pd.DataFrame([{'learn_daily_cpm_limit': 4.0, 'learn_max_bid_limit': 8.0, 'learn_total_imps_limit': 50000, 'learn_daily_imps_limit': 1000, 'max_bid': 1.0, 'attr_conv_pc': 0.0, 'campaign_id': 7793466, 'CPM_daily': 1.3333333333333333, 'imps_served_daily': 1.3333333333333333, 'last_served_date': pd.Timestamp('2015-05-13 00:00:00', tz=None), 'media_cost': 33.96950000000066, 'imps_served_total': 44587, 'attr_conv': 11.0, 'clicks': 13}, {'learn_daily_cpm_limit': 4.0, 'learn_max_bid_limit': 8.0, 'learn_total_imps_limit': 50000, 'learn_daily_imps_limit': 1000, 'max_bid': 10.0, 'attr_conv_pc': 0.0, 'campaign_id': 7793524, 'CPM_daily': 1.6666666666666667, 'imps_served_daily': 1.6666666666666667, 'last_served_date': pd.Timestamp('2015-05-13 00:00:00', tz=None), 'media_cost': 403.4129999999985, 'imps_served_total': 70270, 'attr_conv': 64.0, 'clicks': 39}, {'learn_daily_cpm_limit': 4.0, 'learn_max_bid_limit': 8.0, 'learn_total_imps_limit': 50000, 'learn_daily_imps_limit': 1000, 'max_bid': 2.0, 'attr_conv_pc': 0.0, 'campaign_id': 7810378, 'CPM_daily': 1.0, 'imps_served_daily': 1.0, 'last_served_date': pd.Timestamp('2015-05-13 00:00:00', tz=None), 'media_cost': 20.05379999999988, 'imps_served_total': 11611, 'attr_conv': 2.0, 'clicks': 4}, {'learn_daily_cpm_limit': 4.0, 'learn_max_bid_limit': 8.0, 'learn_total_imps_limit': 50000, 'learn_daily_imps_limit': 1000, 'max_bid': 5.0, 'attr_conv_pc': 0.0, 'campaign_id': 7810380, 'CPM_daily': 9.0, 'imps_served_daily': 9.0, 'last_served_date': pd.Timestamp('2015-05-13 00:00:00', tz=None), 'media_cost': 490.4699999999999, 'imps_served_total': 185351, 'attr_conv': 24.0, 'clicks': 58}, {'learn_daily_cpm_limit': 4.0, 'learn_max_bid_limit': 8.0, 'learn_total_imps_limit': 50000, 'learn_daily_imps_limit': 1000, 'max_bid': 2.0, 'attr_conv_pc': 0.0, 'campaign_id': 7810384, 'CPM_daily': 1.0, 'imps_served_daily': 1.0, 'last_served_date': pd.Timestamp('2015-05-13 00:00:00', tz=None), 'media_cost': 7.686900000000036, 'imps_served_total': 4144, 'attr_conv': 1.0, 'clicks': 0}, {'learn_daily_cpm_limit': 4.0, 'learn_max_bid_limit': 8.0, 'learn_total_imps_limit': 50000, 'learn_daily_imps_limit': 1000, 'max_bid': 2.0, 'attr_conv_pc': 0.0, 'campaign_id': 7810693, 'CPM_daily': 1.0, 'imps_served_daily': 1.0, 'last_served_date': pd.Timestamp('2015-05-13 00:00:00', tz=None), 'media_cost': 136.8782999999997, 'imps_served_total': 84374, 'attr_conv': 7.0, 'clicks': 17}, {'learn_daily_cpm_limit': 4.0, 'learn_max_bid_limit': 8.0, 'learn_total_imps_limit': 50000, 'learn_daily_imps_limit': 1000, 'max_bid': 3.0, 'attr_conv_pc': 0.0, 'campaign_id': 7810695, 'CPM_daily': 1.0, 'imps_served_daily': 1.0, 'last_served_date': pd.Timestamp('2015-05-13 00:00:00', tz=None), 'media_cost': 2.398499999999999, 'imps_served_total': 2123, 'attr_conv': 0.0, 'clicks': 0}, {'learn_daily_cpm_limit': 4.0, 'learn_max_bid_limit': 8.0, 'learn_total_imps_limit': 50000, 'learn_daily_imps_limit': 1000, 'max_bid': 4.0, 'attr_conv_pc': 0.0, 'campaign_id': 7812224, 'CPM_daily': 1.0, 'imps_served_daily': 1.0, 'last_served_date': pd.Timestamp('2015-05-13 00:00:00', tz=None), 'media_cost': 5.969999999999983, 'imps_served_total': 1544, 'attr_conv': 20.0, 'clicks': 0}]).set_index('campaign_id')

TO_RUN = {7810384: {'metrics': {u'learn_max_bid_limit': 8.0, u'learn_daily_imps_limit': 1000, u'CPM_daily': 1.0, u'imps_served_daily': 1.0, u'learn_daily_cpm_limit': 4.0, u'imps_served_total': 4144, u'learn_total_imps_limit': 50000, u'max_bid': 2.0}, 'action': 'INCREASE_MAX_BID', 'rule_group_name': 'prosp_learn_bid_increase', 'rule_group_id': 69}, 7812224: {'metrics': {u'learn_max_bid_limit': 8.0, u'learn_daily_imps_limit': 1000, u'CPM_daily': 1.0, u'imps_served_daily': 1.0, u'learn_daily_cpm_limit': 4.0, u'imps_served_total': 1544, u'learn_total_imps_limit': 50000, u'max_bid': 4.0}, 'action': 'INCREASE_MAX_BID', 'rule_group_name': 'prosp_learn_bid_increase', 'rule_group_id': 69}, 7793466: {'metrics': {u'learn_max_bid_limit': 8.0, u'learn_daily_imps_limit': 1000, u'CPM_daily': 1.3333333333333333, u'imps_served_daily': 1.3333333333333333, u'learn_daily_cpm_limit': 4.0, u'imps_served_total': 44587, u'learn_total_imps_limit': 50000, u'max_bid': 1.0}, 'action': 'INCREASE_MAX_BID', 'rule_group_name': 'prosp_learn_bid_increase', 'rule_group_id': 69}, 7810378: {'metrics': {u'learn_max_bid_limit': 8.0, u'learn_daily_imps_limit': 1000, u'CPM_daily': 1.0, u'imps_served_daily': 1.0, u'learn_daily_cpm_limit': 4.0, u'imps_served_total': 11611, u'learn_total_imps_limit': 50000, u'max_bid': 2.0}, 'action': 'INCREASE_MAX_BID', 'rule_group_name': 'prosp_learn_bid_increase', 'rule_group_id': 69}, 7810695: {'metrics': {u'learn_max_bid_limit': 8.0, u'learn_daily_imps_limit': 1000, u'CPM_daily': 1.0, u'imps_served_daily': 1.0, u'learn_daily_cpm_limit': 4.0, u'imps_served_total': 2123, u'learn_total_imps_limit': 50000, u'max_bid': 3.0}, 'action': 'INCREASE_MAX_BID', 'rule_group_name': 'prosp_learn_bid_increase', 'rule_group_id': 69}}


'''
##########################################################################################################################################################################################
Testing:
##########################################################################################################################################################################################
'''

from link import lnk
lnk.api = mock.MagicMock()


class CampaignAnalysisTest(unittest.TestCase):
    
    def setUp(self):
        self.d = CampaignAnalysis(None)
        

    def tearDown(self):
        pass

    def test_extract_rule_good_response(self):
        
        m = MagicMock()
        m.json = ujson.loads(GOOD_RULE_GROUP_RESPONSE)
        self.d.rbox_api.get.return_value = m

        rule_name = m.json[0]['rule_group_name']
        self.d.opt_rules = {}
        self.d.opt_rules[rule_name] = {}

        self.d.extract_rule(rule_name)

        self.assertTrue(self.d.opt_rules[rule_name]['rule_group_id'])
        self.assertTrue(len(self.d.opt_rules[rule_name]['conditions']) > 0)
        self.assertTrue(len(self.d.opt_rules[rule_name]['metrics']) > 0)

    def test_extract_rule_bad_response(self):

        m = MagicMock()
        m.json = ujson.loads("[]")
        self.d.rbox_api.get.return_value = m
        
        with self.assertRaises(Exception):
            self.d.extract_rule("bad_rule")


    def test_evaluate_rules_true(self):

        self.d.opt_rules = deepcopy(GOOD_OPT_RULES)
        row = deepcopy(ROW_DICT_TRUE)

        rule_name = self.d.opt_rules.keys()[0]
        row = pd.DataFrame([row]).iloc[0]

        self.assertTrue(self.d.evaluate_rules(rule_name, row))

    def test_evaluate_rules_false(self):

        self.d.opt_rules = deepcopy(GOOD_OPT_RULES)
        row = deepcopy(ROW_DICT_FALSE)

        rule_name = self.d.opt_rules.keys()[0]
        row = pd.DataFrame([row]).iloc[0]

        self.assertFalse(self.d.evaluate_rules(rule_name, row))


    def test_evaluate_rules_missing_col(self):

        self.d.opt_rules = deepcopy(GOOD_OPT_RULES)
        row = deepcopy(ROW_DICT_MISSING)

        rule_name = self.d.opt_rules.keys()[0]
        row = pd.DataFrame([row]).iloc[0]

        with self.assertRaises(KeyError):
            self.d.evaluate_rules(rule_name, row)

    def test_evaluate_rules_no_max_bid(self):
        self.d.opt_rules = deepcopy(GOOD_OPT_RULES)
        row = deepcopy(ROW_DICT_TRUE)
        row['max_bid'] = np.nan
        rule_name = self.d.opt_rules.keys()[0]
        row = pd.DataFrame([row]).iloc[0]
        self.assertFalse(self.d.evaluate_rules(rule_name, row))


    def test_analyze_empty_DF(self):

        m = MagicMock()
        m.json = ujson.loads(GOOD_RULE_GROUP_RESPONSE)
        self.d.rbox_api.get.return_value = m
        self.d.extract_rule("prosp_learn_bid_increase")

        self.d.df = FIXTURE_DF.copy()
        self.d.df = self.d.df.drop(self.d.df.index)
        self.d.analyze()


    def test_reshape_missing_index(self):

        index_col = 'campaigns'
        self.d.opt_rules = deepcopy(GOOD_OPT_RULES)
        rule_name = self.d.opt_rules.keys()[0]
        self.d.opt_rules[rule_name][index_col] = ["whaterver.com"]
        self.d.df = FIXTURE_DF.copy()
        with self.assertRaises(AttributeError):
            self.d.reshape()


    def test_reshape_correct(self):

        self.d.opt_rules = deepcopy(GOOD_OPT_RULES)
        self.d.df = FIXTURE_DF.copy()
        self.d.analyze()
        self.d.reshape()
        self.assertEqual(self.d.to_run, TO_RUN)












