import sys
sys.path.append("../")
from opt_script import Action
from numpy import dtype
import pandas as pd
import json
import time
import numpy

DOMAIN_TARGETS_COL_TYPES = {u'domain': dtype('O'), u'profile_id': dtype('int64')}


class DomainAction(Action):
    
    def __init__(self):
        pass

    def run(self, to_run, campaign):
        self.to_run = to_run
        self.campaign = campaign
        self.actions()

    def actions(self):
        to_exclude = {}
        for domain in self.to_run.keys():
            try:
                if self.to_run[domain]['action'] == "EXCLUDE":
                    to_exclude[domain] = self.to_run[domain]
            except KeyError:
                raise KeyError("Missing rule group actions")
        self.exclude_domains(to_exclude)


    def get_campaign_domain_targets(self):

        try:
            response = self.console.get_profile("/campaign?id=%s"%self.campaign)
            try:
                if response.json['response']['profile']['domain_action'] == 'exclude':   
                    domain_targets = response.json['response']['profile']['domain_targets']
                    return domain_targets
                else:
                    raise Exception("Campaign %s is not excluding domains in profile targeting"%self.campaign)
            
            except KeyError:
                self.logger.error("retrieving domain_targets failed with campaign %s" %self.campaign)
                raise KeyError

        except KeyError:
            self.logger.error("console.get_profile failed with campaign %s" %self.campaign)
            raise KeyError
        

    def adjust_domain_target(self, domain_targets, domain):

        if domain_targets is None:
            domain_targets = [{'domain':domain, 'profile_id': 22606190}]

        elif pd.DataFrame(domain_targets).dtypes.to_dict() != DOMAIN_TARGETS_COL_TYPES:
            raise TypeError("Incorrect column types for domain_targets")
        
        elif domain not in pd.DataFrame(domain_targets)['domain'].unique():
            domain_targets.append({'domain':domain, 'profile_id': 22606190})

        return domain_targets


    def push_log(self, log):

        r = self.rockerbox.post("/opt_log", data=json.dumps(log))
        if r.json['status'] != 'ok':
            raise TypeError("Incorrect Opt Log %s" %str(log))


    def exclude_domains(self, to_exclude):

        for domain in to_exclude.keys():
            try:
                to_exclude[domain]['rule_group_id']
                to_exclude[domain]['metrics']
            except KeyError:
                raise KeyError("to_exclude missing rule_group_id/metrics")

        for domain in to_exclude.keys():
            
            old_domain_targets = self.get_campaign_domain_targets()
            new_domain_targets = self.adjust_domain_target(old_domain_targets, domain)
                
            log = { "rule_group_id": to_exclude[domain]['rule_group_id'],
                    "object_modified": "campaign_profile",
                    "campaign_id": self.campaign,
                    "field_name": 'domain_targets',
                    "field_old_value": old_domain_targets,
                    "field_new_value": new_domain_targets,
                    "metric_values": to_exclude[domain]['metrics']
            }  
            self.logger.info(log)
            # self.push_log(log)

            time.sleep(3)







