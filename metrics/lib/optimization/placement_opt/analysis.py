import sys
sys.path.append("../")
from opt_script import Analysis
import json
import re

PLACEMENT_RULES = { 

    'no_conv_placement_unprofitable': {
            'desc': "No convs/unprofitable:",
            'action': 'EXCLUDE_PLACEMENT',
    },

    'one_conv_placement_unprofitable': {
            'desc': "One convs/unprofitable:",
            'action': 'EXCLUDE_PLACEMENT'
    },

    'multi_conv_placement_unprofitable': {
            'desc': "Multi convs/unprofitable: (MEDIA TRADER INVESTIGATE)",
            'action': None
    },

    'no_conv_placement_clickfraud': {
            'desc': "No convs/click fraud:",
            'action': 'EXCLUDE_PLACEMENT'
    }
}


DF_COLS = ['clicks', 'convs', 'imps_served_apnx', 'last_served_date','media_cost', 
            'num_days', 'profit', 'revenue', 'imps_served_rbox', 'loaded', 
            'CTR', 'RPA', 'loss_limit', 'RPA_multiplier','imp_served_cutoff', 
            'CTR_cutoff', 'loaded_ratio','apnx_rbox_served_ratio']

class PlacementAnalysis(Analysis):
    
    def __init__(self, df):

        self.df = df
        self.placement_rules = PLACEMENT_RULES
        self.to_run = {}
        

    def extract_rule(self, rule_name):

        r = self.rbox_api.get("/opt_rules?name=%s"%rule_name)
        if len(r.json) > 0:
            self.placement_rules[rule_name]['rule_group_id'] = r.json[0]['rule_group_id']
            self.placement_rules[rule_name]['conditions'] = [d['rule'] for d in r.json]
            
            metrics = []
            for cond in self.placement_rules[rule_name]['conditions']:
                metrics = metrics + re.findall(r"%\((\w+)\)", cond)
            self.placement_rules[rule_name]['metrics'] = metrics

        else:
            raise Exception("Incorrect Rule %s"%rule_name)


    def evaluate_rules(self, rule_name, row):

        conditions = self.placement_rules[rule_name]['conditions']
        
        for cond in conditions:
            if not eval(cond % row.to_dict()):
                return False        
        return True


    @Analysis.verify_cols(DF_COLS)
    def analyze(self):

        for rule_name in self.placement_rules.keys():
            self.extract_rule(rule_name)


        for rule_name in self.placement_rules.keys():

            rows = self.df.apply(lambda row: self.evaluate_rules(rule_name, row), axis = 1)
            placements = self.df[rows].index.get_values()
            self.placement_rules[rule_name]['placements'] = placements


    @Analysis.verify_cols([ "last_served_date", "num_days", "imps_served", 
                            "convs","clicks","media_cost", "revenue","profit",
                            "CTR", "RPA", "RPA_multiplier","loss_limit",
                            "imp_served_cutoff","CTR_cutoff"])
    def reshape(self):
        '''
        Creates json/dictionary object for placement metrics:

        { placement: 'metrics': {m1:v1, m2:v2, ... }, 
                        'rule_group_name': rule_group_name,
                        'action': ACTION,
                        'rule_group_id': id 
        }
        '''

        # for rule in self.placement_rules.keys():
        #     try:
        #         self.placement_rules[rule]['rule_group_id']
        #     except KeyError:
        #         raise AttributeError("Missing rule ids")

        #     try:
        #         self.placement_rules[rule]['placements']
        #     except KeyError:
        #         raise AttributeError("Missing placements")
        
        for rule in self.placement_rules.keys():
            for placement in self.placement_rules[rule]['placements']:
                if placement not in self.df.index.get_values():
                    raise AttributeError("Missing placement")

        to_run = {}

        # Reshaping to placement level dict
        for rule in self.placement_rules.keys():
            metrics = self.placement_rules[rule]['metrics']

            for placement in self.placement_rules[rule]['placements']:

                to_run[placement] = {}
                to_run[placement]['metrics'] = self.df.ix[placement][metrics].to_dict()
                to_run[placement]['rule_group_name'] = rule
                to_run[placement]['action'] = self.placement_rules[rule]['action']
                to_run[placement]['rule_group_id'] =  self.placement_rules[rule]['rule_group_id']

        self.to_run = to_run



