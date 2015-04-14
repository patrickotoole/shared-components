import sys
sys.path.append("../")
from opt_script import Analysis
from rules import PLACEMENT_RULES

class Placement_Analysis(Analysis):
    
    def __init__(self, df):

        self.df = df
        self.results = {}
        self.metrics = {}
    
    @Analysis.verify_cols(['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA', 'CTR', 'CTR_cutoff', 'imps_served', 'imp_served_cutoff'])
    def analyze(self):
        
        for rule in PLACEMENT_RULES.keys():

            placements = self.df[self.df.apply(lambda row: PLACEMENT_RULES[rule]['filter'](row), axis = 1)].index.tolist()
            PLACEMENT_RULES[rule]['placements'] = placements

        self.results =  PLACEMENT_RULES

    def reshape(self):
        '''
        Creates json/dictionary object for placement metrics:

        {   placement: 'metrics': {m1:v1, m2:v2, ... }, 
                        'rule_group_name': rule_group_name,
                        'action': ACTION,
                        'rule_group_id': id 
        }
        '''
        placement_metrics = {}

        # Getting rule group id
        for rule in self.results.keys():
            r = self.rockerbox.get("/opt_rules?name=%s"%group_name)
            try:
                self.results[rule]['rule_group_id'] = r.json[0]['rule_group_id']        
            
            except IndexError:
                self.results[rule]['rule_group_id'] = False
                self.logger.error("Bad rule group name {}".format(rule))

        # Reshaping to placement level dict
        for rule in self.results.keys():
            metrics = self.results[rule]['metrics']
            for placement in self.results[rule]['placements']:
                placement_metrics[placement] = {}
                placement_metrics[placement]['metrics'] = self.df.ix[placement][metrics].to_dict()
                placement_metrics[placement]['rule_group_name'] = rule
                placement_metrics[placement]['action'] = self.results[rule]['action']
                placement_metrics[placement]['rule_group_id'] =  self.results[rule]['rule_group_id']

        self.to_run = placement_metrics
