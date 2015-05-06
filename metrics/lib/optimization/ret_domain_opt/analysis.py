
import sys
sys.path.append("../")
from opt_script import Analysis
import json
import re


DOMAIN_RULES = {
    'domain_low_visible':{'action': 'EXCLUDE'},
    'domain_low_loaded':{'action': 'EXCLUDE'},
    'domain_low_served_ratio':{'action': 'EXCLUDE'},
}
DF_COLS = [ 'convs', 'imps_served_apnx', 'last_served_date', 'imps_served_rbox',
            'loaded', 'visible', 'imps_served_cutoff', 'imps_loaded_cutoff',
            'loaded_ratio_cutoff', 'visible_ratio_cutoff',
            'served_ratio_cutoff', 'visible_ratio', 'loaded_ratio',
            'served_ratio']

class DomainAnalysis(Analysis):
    
    def __init__(self, df):

        self.df = df

        self.opt_rules = DOMAIN_RULES
        self.to_run = {}

    def extract_rule(self, rule_name):

        r = self.rbox_api.get("/opt_rules?name=%s"%rule_name)

        if len(r.json) > 0:
            self.opt_rules[rule_name]['rule_group_id'] = r.json[0]['rule_group_id']
            self.opt_rules[rule_name]['conditions'] = [d['rule'] for d in r.json]
            
            metrics = []
            for cond in self.opt_rules[rule_name]['conditions']:
                metrics = metrics + re.findall(r"%\((\w+)\)", cond)
            self.opt_rules[rule_name]['metrics'] = metrics

        else:
            raise Exception("Bad Rule: %s"%rule_name)


    def evaluate_rules(self, rule_name, row):

        conditions = self.opt_rules[rule_name]['conditions']
        evals = [eval(cond % row.to_dict()) for cond in conditions]
        return (False not in evals)


    @Analysis.verify_cols(DF_COLS)
    def analyze(self):
        
        for rule_name in self.opt_rules.keys():
            self.extract_rule(rule_name)

        for rule_name in self.opt_rules.keys():

            rows = self.df.apply(lambda row: self.evaluate_rules(rule_name, row), axis = 1)

            if len(rows) > 0:
                domains = self.df[rows].index.get_values()
            else:
                domains  = []

            self.opt_rules[rule_name]['domains'] = domains




    def reshape(self):

        ## Checking for domains that don't exist in dataframe
        for rule in self.opt_rules.keys():
            for domain in self.opt_rules[rule]['domains']:
                if domain not in self.df.index.get_values():
                    raise AttributeError("Missing domain %s in df" %domain)

        ## Reshaping to domain level dictionary
        to_run = {}
        for rule in self.opt_rules.keys():
            metrics = self.opt_rules[rule]['metrics']

            for domain in self.opt_rules[rule]['domains']:

                to_run[domain] = {}
                to_run[domain]['metrics'] = self.df.ix[domain][metrics].to_dict()
                to_run[domain]['rule_group_name'] = rule
                to_run[domain]['action'] = self.opt_rules[rule]['action']
                to_run[domain]['rule_group_id'] =  self.opt_rules[rule]['rule_group_id']

        self.to_run = to_run

    def run_analysis(self):
        if len(self.df) > 0:
            self.analyze()            
            self.reshape()
        else:
            self.to_run = {}
