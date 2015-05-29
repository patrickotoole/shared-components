import sys
sys.path.append("../")
from opt_script import Action
from numpy import dtype
import pandas as pd
import json
import time
import numpy
from copy import deepcopy
from datetime import datetime
import pprint
TODAY = datetime.today().strftime('%Y-%m-%d')

class CampaignAction(Action):
    
    def __init__(self, to_run, run_params):
        self.to_run = to_run
        self.run_params = run_params

    def run(self):
        self.actions()

    def actions(self):
        max_bids_to_increase = {}
        to_deactivate = {}

        for campaign in self.to_run.keys():
            try:
                for act in self.to_run[campaign]:
                    
                    if act['action']  == "INCREASE_MAX_BID":
                        max_bids_to_increase[campaign] = act
                
                    elif act['action'] == "DEACTIVATE":
                        to_deactivate[campaign] =  act
            except KeyError:
                raise KeyError("Missing rule group actions")
        
        self.increase_max_bids(max_bids_to_increase)
        self.deactivate_campaigns(to_deactivate)


    def push_log(self, log):

        self.logger.info("pushing to opt_log / Apnx")

        r = self.rockerbox.post("/opt_log", data=json.dumps(log))
        if r.json['status'] != 'ok':
            self.logger.error(r.text)
            raise TypeError("Error with Opt Log:\n %s" %r.text)
            
        self.logger.info("push ok\n")

    def check_for_prev_run(self, campaign_id, rule_group_id):

        query = '''
        SELECT * FROM opt_log WHERE campaign_id = {}  AND date(last_modified) >= "{}" 
        AND rule_group_id  = {} AND field_old_value  != field_new_value  
        '''.format(campaign_id, TODAY, rule_group_id)

        df = self.reporting_db.select_dataframe(query)
        return len(df) > 0


    def increase_max_bids(self, max_bids_to_increase):

        for campaign in max_bids_to_increase.keys():
            try:
                max_bids_to_increase[campaign]['rule_group_id']
                max_bids_to_increase[campaign]['metrics']
            except KeyError:
                raise KeyError("to_exclude missing rule_group_id/metrics")

        self.logger.info("INCREASING BIDS...")
        for campaign in max_bids_to_increase.keys():

            old_max_bid = max_bids_to_increase[campaign]['metrics']['max_bid']
            new_max_bid = old_max_bid + self.run_params['increase_max_bid_by']

            ## Changing to int if necessary, b/c Appnexus sucks
            if old_max_bid % 1 == 0:
                old_max_bid = int(old_max_bid)

            log = { "rule_group_id": max_bids_to_increase[campaign]['rule_group_id'],
                        "object_modified": "campaign",
                        "campaign_id": campaign,
                        "field_name": 'max_bid',
                        "field_old_value": old_max_bid,
                        "field_new_value": new_max_bid,
                        "metric_values": max_bids_to_increase[campaign]['metrics']
                }

            if self.check_for_prev_run(log['campaign_id'], log['rule_group_id']):
                self.logger.info("Already ran on %s for %s" %(log['campaign_id'], TODAY))
            else:
                self.logger.info("\n" + pprint.pformat(log))
                self.push_log(log)
                time.sleep(3)

    def deactivate_campaigns(self, to_deactivate):

        for campaign in to_deactivate.keys():
            try:
                to_deactivate[campaign]['rule_group_id']
                to_deactivate[campaign]['metrics']
            except KeyError:
                raise KeyError("to_deactivate missing rule_group_id/metrics")

        self.logger.info("DEACTIVATING CAMPAIGNS...")
        
        for campaign in to_deactivate.keys():

            log = { "rule_group_id": to_deactivate[campaign]['rule_group_id'],
                        "object_modified": "campaign",
                        "campaign_id": campaign,
                        "field_name": 'state',
                        "field_old_value": "active",
                        "field_new_value": "inactive",
                        "metric_values": to_deactivate[campaign]['metrics']
                }

            if self.check_for_prev_run(log['campaign_id'], log['rule_group_id']):
                self.logger.info("Already ran on %s for %s" %(log['campaign_id'], TODAY))
            else:
                self.logger.info("\n" + pprint.pformat(log) + "\n")
                self.push_log(log)
                time.sleep(3)


