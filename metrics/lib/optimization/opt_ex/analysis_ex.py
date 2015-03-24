import sys
sys.path.append("../")
from opt_script import Analysis

class AnalysisExample(Analysis):
    def __init__(self, df, threshold=.5):
        self.df = df
        self.results = {}
        self.threshold = threshold
    
    def analyze(self):
        self.results["visibility"] = self.analyze_visibility()

    @Analysis.verify_cols(["campaign", "tag", "num_served", "percent_visible"])
    def analyze_visibility(self):
        # We want to ban all tags that have a visibility percentage
        # that is less than the threshold
        return self.df[self.df.percent_visible < self.threshold]
