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

TODAY = datetime.today().strftime('%Y-%m-%d')

class CampaignAction(Action):
    
    def __init__(self, to_run, run_params):
        self.to_run = to_run
        self.run_params = run_params

    def run(self):
        self.actions()

    def actions(self):
        max_bids_to_increase = {}
        for campaign in self.to_run.keys():
            try:
                if self.to_run[campaign]['action'] == "INCREASE_MAX_BID":
                    max_bids_to_increase[campaign] = self.to_run[campaign]
            except KeyError:
                raise KeyError("Missing rule group actions")

        self.increase_max_bids(max_bids_to_increase)


    def push_log(self, log):

        self.logger.info("pushing to opt_log / Apnx")

        r = self.rockerbox.post("/opt_log", data=json.dumps(log))
        if r.json['status'] != 'ok':
            raise TypeError("Incorrect Opt Log %s" %str(log))

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

        for campaign in max_bids_to_increase.keys():

            old_max_bid = max_bids_to_increase[campaign]['metrics']['max_bid']
            new_max_bid = old_max_bid + self.run_params['increase_max_bid_by']

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
                self.logger.info(log)
                self.push_log(log)
                time.sleep(3)







