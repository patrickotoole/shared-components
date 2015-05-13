import sys
sys.path.append("../")
from opt_script import Action
from numpy import dtype
import pandas as pd
import json
import time
import numpy
from copy import deepcopy


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

            self.logger.info(log)
            # self.push_log(log)
            # time.sleep(3)







