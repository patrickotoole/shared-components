import pandas as pd
import unittest
import sys
sys.path.append("../../")
from opt_script import DataSource

class DataSourceTestEx(DataSource):
    def filter(self):
        pass

    def pull(self):
        self.df = pd.DataFrame([
                {"a": 0, "b": 1, "c": 2}, 
                {"a": 3, "b": 4, "c": 5}, 
                {"a": 6, "b": 7, "c": 8}
                ])

    def transform(self):
        pass

# class DataSourceTest(unittest.TestCase):
#     def setUp(self):
#         d = DataSourceTestEx()
#         d.pull()
#         pass

#     def tearDown(self):
#         pass

#     def test_something(self):
#         assert True
