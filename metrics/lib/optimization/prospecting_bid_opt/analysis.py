import sys
sys.path.append("../")
from opt_script import Analysis
import json
import re
from numpy import nan


CAMPAIGN_RULES = {
    'prosp_learn_bid_increase':{'action': 'INCREASE_MAX_BID'},
    'unprofitable_no_conv': {'action': 'DEACTIVATE'},
    'yoshi_low_loaded': {'action': 'DEACTIVATE'},
    'yoshi_low_visible': {'action': 'DEACTIVATE'}
}


DF_COLS = ['CPM_daily', 'clicks', 'imps_served_daily', 'imps_served_total',
       'last_served_date', 'media_cost', 'attr_conv', 'attr_conv_pc',
       'total_conv', 'num_loaded', 'num_served', 'num_visible', 'max_bid',
       'campaign_state', 'learn_total_imps_limit',
       'learn_daily_imps_limit', 'learn_daily_cpm_limit',
       'learn_max_bid_limit', 'loss_limit', 'visible_ratio',
       'loaded_ratio', 'imps_loaded_cutoff', 'visible_ratio_cutoff',
       'loaded_ratio_cutoff', 'imps_served_cutoff']

class CampaignAnalysis(Analysis):

    def __init__(self, df):

        self.df = df
        self.opt_rules = CAMPAIGN_RULES
        self.to_run = {}

    def run_analysis(self):
        self.logger.info("Starting Opt Rule Analysis ...")

        if len(self.df) > 0:
            self.analyze()            
            self.reshape()
            self.logger.info("Finished Opt Rule Analysis\n")
        else:
            self.logger.info("No data to run analysis on \n")
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
            logger.error("Extract rule failed with %s"%rule_name)
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
            self.logger.info("Evaluating rule %s" %rule_name)

            rows = self.df.apply(lambda row: self.evaluate_rules(rule_name, row), axis = 1)

            if len(rows) > 0:
                campaigns = self.df[rows].index.get_values()
            else:
                campaigns  = []
            self.opt_rules[rule_name]['campaigns'] = campaigns

            self.logger.info("rule %s applies for %d campaigns" %(rule_name,len(campaigns)))


    def reshape(self):

        ## Checking for campaigns that don't exist in dataframe
        for rule in self.opt_rules.keys():
            for campaign in self.opt_rules[rule]['campaigns']:
                if campaign not in self.df.index.get_values():
                    logger.error("Missing campaigns %s in df" %campaign)
                    raise AttributeError("Missing campaigns %s in df" %campaign)

        ## Reshaping to campaigns level dictionary
        to_run = {}
        for rule in self.opt_rules.keys():
            metrics = self.opt_rules[rule]['metrics']

            for campaign in self.opt_rules[rule]['campaigns']:

                reshaped = {}
                
                reshaped['metrics'] = self.df.ix[campaign][metrics].to_dict()
                reshaped['rule_group_name'] = rule
                reshaped['action'] = self.opt_rules[rule]['action']
                reshaped['rule_group_id'] =  self.opt_rules[rule]['rule_group_id']

                if campaign not in to_run.keys():
                    to_run[campaign] = [reshaped]
                else:
                    to_run[campaign].append(reshaped)

        self.to_run = to_run

