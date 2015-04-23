from datasource_ex import DataSourceExample
from analysis_ex import AnalysisExample
from action_ex import ActionExample

import sys
sys.path.append("../../")
import lib.custom_wrappers

approved_advertisers = ["smartertravelmedia", "baublebar"]
d = DataSourceExample(approved_advertisers)
d.pull()
d.transform()
d.filter()

t = AnalysisExample(d.df, threshold=.3)
t.analyze()

a = ActionExample(t.results)
a.actions()
