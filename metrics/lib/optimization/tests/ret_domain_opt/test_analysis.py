import pandas as pd
import unittest
import sys
sys.path.append("../../")
from ret_domain_opt import DomainAnalysis

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

class DomainAnalysisTest(unittest.TestCase):
    
    def setUp(self):
        self.d = DomainAnalysis(None)
        lnk.api = mock.MagicMock()

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


    def test_analyze_empty_DF(self):
        self.d.df = FIXTURE_DF
        self.d.df = self.d.df.drop(self.d.df.index)


        m = MagicMock()
        m.json = ujson.loads(GOOD_RULE_GROUP_RESPONSE)
        self.d.rbox_api.get.return_value = m

        
        self.d.analyze()


    def test_reshape_missing_domain(self):

        self.d.opt_rules = deepcopy(GOOD_OPT_RULES)
        rule_name = self.d.opt_rules.keys()[0]

        self.d.opt_rules[rule_name]['domains'] = ["whaterver.com"]
        self.d.df = FIXTURE_DF
        
        with self.assertRaises(AttributeError):
            self.d.reshape()


    def test_reshape_correct(self):

        self.d.opt_rules = deepcopy(GOOD_OPT_RULES_GOOD_DOMAIN)
        self.d.df = FIXTURE_DF

        self.d.reshape()

        self.assertEqual(self.d.to_run, TO_RUN)












