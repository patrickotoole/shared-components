import pandas as pd
import unittest
import sys
sys.path.append("../../")
from opt_script import Analysis
from nose.tools import *

class AnalysisTestEx(Analysis):
    def __init__(self, df):
        self.df = df

    def analyze(self):
        pass

    @Analysis.verify_cols(["a", "b", "c"])
    @Analysis.verify_index(["d"])
    def analyze_pass(self):
        pass

    @Analysis.verify_cols(["d","e","f"])
    def analyze_columns_fail(self):
        pass

    @Analysis.verify_index(["a"])
    def analyze_index_fail(self):
        pass

# class AnalysisTest(unittest.TestCase):
#     def setUp(self):
#         df = pd.DataFrame([
#                 {"a": 0, "b": 1, "c": 2, "d": 5}, 
#                 {"a": 3, "b": 4, "c": 5, "d": 5}, 
#                 {"a": 6, "b": 7, "c": 8, "d": 5}
#                 ]).set_index("d")

#         self.t = AnalysisTestEx(df)

#     def tearDown(self):
#         pass

#     def test_good_columns_and_index(self):
#         self.t.analyze_pass()

#     @raises(Exception)
#     def test_bad_columns(self):
#         self.t.analyze_columns_fail()

#     @raises(Exception)
#     def test_bad_index(self):
#         self.t.analyze_index_fail(
# )
