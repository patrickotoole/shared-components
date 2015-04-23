import sys
sys.path.append("../")
from opt_script import Analysis
import json


PLACEMENT_RULES = { 

    'no_conv_placement_unprofitable': {
            'metrics': ['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA'],
            'desc': "No convs/unprofitable:",
            'action': 'EXCLUDE_PLACEMENT',
    },

    'one_conv_placement_unprofitable': {
            'metrics': ['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA'],
            'desc': "One convs/unprofitable:",
            'action': 'EXCLUDE_PLACEMENT'
    },

    'multi_conv_placement_unprofitable': {
            'metrics': ['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA'],
            'desc': "Multi convs/unprofitable: (MEDIA TRADER INVESTIGATE)",
            'action': None
    },

    'no_conv_placement_clickfraud': {
            'metrics': ['convs', 'CTR', 'CTR_cutoff', 'imps_served', 'imp_served_cutoff'],
            'desc': "No convs/click fraud:",
            'action': 'EXCLUDE_PLACEMENT'
    }
}

class PlacementAnalysis(Analysis):
    
    def __init__(self, df):

        self.df = df
        self.placement_rules = PLACEMENT_RULES
        self.to_run = {}

    def find_no_conv_placement_unprofitable(self, row):
        return row['convs'] == 0 and row['profit'] < max(-1 * row['losim`s_limit'], -1 * row['RPA_multiplier'] * row['RPA'])

    def find_one_conv_placement_unprofitable(self, row):
        return row['convs'] == 1 and row['profit'] < max(-1 * row['loss_limit'], -1 * row['RPA_multiplier'] * row['RPA'])

    def find_multi_conv_placement_unprofitable(self,row):
        return row['convs'] > 1 and row['profit'] < max(-1 * row['loss_limit'], -1 * row['RPA_multiplier'] * row['RPA'])

    def find_no_conv_placement_clickfraud(self, row):
        return row['convs'] == 0 and row['CTR'] >= row['CTR_cutoff'] and row['imps_served'] >= row['imp_served_cutoff']


    @Analysis.verify_cols([ "last_served_date", "num_days", "imps_served", 
                            "convs","clicks","media_cost", "revenue","profit",
                            "CTR", "RPA", "RPA_multiplier","loss_limit",
                            "imp_served_cutoff","CTR_cutoff"])
    def analyze(self):


        rows = self.df.apply(self.find_no_conv_placement_unprofitable, axis = 1)
        if len(rows) > 0:
		placements = self.df[rows].index.get_values()
        else:
		placements = []
	self.placement_rules['no_conv_placement_unprofitable']['placements'] = placements


        rows = self.df.apply(self.find_one_conv_placement_unprofitable, axis = 1)
        if len(rows) >0:
		placements = self.df[rows].index.get_values()
        else:
		placements = []
	self.placement_rules['one_conv_placement_unprofitable']['placements'] = placements

        rows = self.df.apply(self.find_multi_conv_placement_unprofitable, axis = 1)
        if len(rows) > 0:
		placements = self.df[rows].index.get_values()
	else:
		placements = []
	self.placement_rules['multi_conv_placement_unprofitable']['placements'] = placements

        rows = self.df.apply(self.find_no_conv_placement_clickfraud, axis = 1)
        if len(rows) > 0:
		placements = self.df[rows].index.get_values()
        else:
		placements = []
	self.placement_rules['no_conv_placement_clickfraud']['placements'] = placements

    def add_rule_group_ids(self):

        for rule in self.placement_rules.keys():
            r = self.rbox_api.get("/opt_rules?name=%s"%rule)
            try:
                self.placement_rules[rule]['rule_group_id'] = r.json[0]['rule_group_id']
            except IndexError:
                self.logger.error("Bad rule group name {}".format(rule))
                raise IndexError

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


        for rule in self.placement_rules.keys():
            try:
                self.placement_rules[rule]['rule_group_id']
            except KeyError:
                raise AttributeError("Missing rule ids")

            try:
                self.placement_rules[rule]['placements']
            except KeyError:
                raise AttributeError("Missing placements")
        
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



