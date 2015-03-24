from datasource_ex import DataSourceExample
from transform_ex import TransformationExample
from action_ex import ActionExample

approved_advertisers = ["smartertravelmedia", "baublebar"]
d = DataSourceExample(approved_advertisers)
d.pull()
d.transform()
d.filter()

t = TransformationExample(d.df, threshold=.3)
t.analyze()

a = ActionExample(t.results)
a.actions()
