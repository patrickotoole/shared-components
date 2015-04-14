import pandas as pd
import unittest
import sys
sys.path.append("../../")
from opt_script import Action
from nose.tools import *

class ActionTestEx(Action):
    def __init__(self, results):
        self.results = results

    def actions(self):
        pass

    @Action.verify_param_cols(["a", "b", "c"])
    @Action.verify_param_index(["d"])
    def action_pass(self, df):
        pass

    @Action.verify_param_cols(["d","e","f"])
    def action_columns_fail(self, df):
        pass

    @Action.verify_param_index(["a"])
    def action_index_fail(self, df):
        pass

# class ActionTest(unittest.TestCase):
#     def setUp(self):
#         df = pd.DataFrame([
#                 {"a": 0, "b": 1, "c": 2, "d": 5}, 
#                 {"a": 3, "b": 4, "c": 5, "d": 5}, 
#                 {"a": 6, "b": 7, "c": 8, "d": 5}
#                 ]).set_index("d")

#         self.a = ActionTestEx({"results_type": df})

#     def tearDown(self):
#         pass

#     def test_good_columns_and_index(self):
#         self.a.action_pass(self.a.results["results_type"])

#     @raises(Exception)
#     def test_bad_columns(self):
#         self.a.action_columns_fail(self.a.results["results_type"])

#     @raises(Exception)
#     def test_bad_index(self):
#         self.a.action_index_fail(self.a.results["results_type"])
