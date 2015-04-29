import sys
sys.path.append("../")
from opt_script import Action
from numpy import dtype
import pandas as pd
import json
import time
PLATFORM_PLACEMENT_COL_TYPES = {'action': dtype('O'), 'deleted': dtype('bool'), 'id': dtype('int64')}


class PlacementAction(Action):
    
    def __init__(self, to_run, campaign):
        self.to_run = to_run
        self.campaign = campaign

    def actions(self):
        to_exclude = {}
        for placement in self.to_run.keys():
            try:
                if self.to_run[placement]['action'] == "EXCLUDE_PLACEMENT":
                    to_exclude[placement] = self.to_run[placement]
            except KeyError:
                raise KeyError
        self.exclude_placements(to_exclude)

    def get_campaign_placement_targets(self):
        '''
        Returns the json object with placement targeting info from Appnexus
        '''

        try:
            response = self.console.get_profile("/campaign?id=%s"%self.campaign)
            try:
                placement_targets = response.json['response']['profile']['platform_placement_targets']
                return placement_targets
            
            except KeyError:
                self.logger.error("retrieving platform_placement_targets failed with campaign id %s" %self.campaign)
                raise KeyError

        except KeyError:
            self.logger.error("console.get_profile failed with campaign id %s" %self.campaign)
            raise KeyError
        

    def adjust_placement_target(self, placement_targets, placement_id, new_action):
        '''
        - If placement already exists in the platform_placement_targets 
        object,then its action is changed to new_action
        - If placement does not exist, then new targeting is added
        '''

        if placement_targets is None:
            placement_targets = [{  'id':int(placement_id), 
                                    'action':new_action,
                                    'deleted':False
                                }]

        elif pd.DataFrame(placement_targets).dtypes.to_dict() != PLATFORM_PLACEMENT_COL_TYPES:
            raise TypeError("Incorrect column types for platform_placement_targets")
        
        elif int(placement_id) in pd.DataFrame(placement_targets)['id'].unique():
            
            placement_targets = pd.DataFrame(placement_targets)
            placement_targets = placement_targets.set_index('id')
            placement_targets.ix[int(placement_id) , 'action'] = new_action
            placement_targets = placement_targets.reset_index()
            placement_targets = placement_targets.to_dict( 'records')

        else:
            placement_targets.append({  'id': int(placement_id) , 
                                        'action':new_action,
                                        'deleted':False
                                    })

        return placement_targets

    def check_for_no_targeting(self, old_placement_targets, new_placement_targets):
        '''
        Returns True if old old_placement_targets has inclusion targeting
        and new_placement_targets has no inclusion targeting 
        '''
        if old_placement_targets == None:
            return False

        old_placement_targets_DF = pd.DataFrame(old_placement_targets)
        new_placement_targets_DF = pd.DataFrame(new_placement_targets)

        old_placements_has_targeting = "include" in old_placement_targets_DF['action'].unique()
        new_placements_has_targeting = "include" in new_placement_targets_DF['action'].unique()


        if (old_placements_has_targeting and not new_placements_has_targeting):
            return True
        else:
            return False


    def push_log(self, log):
        r = self.rockerbox.post("/opt_log", data=json.dumps(log))
        if r.json['status'] != 'ok':
            raise TypeError("Incorrect Opt Log %s" %str(log))


    def exclude_placements(self, to_exclude):


        for placement in to_exclude.keys():
            try:
                to_exclude[placement]['rule_group_id']
                to_exclude[placement]['metrics']
            except KeyError:
                raise KeyError("to_exclude missing rule_group_id/metrics")


        for placement in to_exclude.keys():
            print placement
            
            old_placement_targets = self.get_campaign_placement_targets()
            new_placement_targets = self.adjust_placement_target(old_placement_targets, placement, 'exclude')
                
            log = { "rule_group_id": to_exclude[placement]['rule_group_id'],
                    "object_modified": "campaign_profile",
                    "campaign_id": self.campaign,
                    "field_name": 'platform_placement_targets',
                    "field_old_value": old_placement_targets,
                    "field_new_value": new_placement_targets,
                    "metric_values": to_exclude[placement]['metrics']
            }  
            self.logger.info(log)
            self.push_log(log)


            # Deactivating campaign if all placement targets are removed
            if self.check_for_no_targeting(old_placement_targets, new_placement_targets):
                deactivate_log = { "rule_group_id": to_exclude[placement]['rule_group_id'],
                                    "object_modified": "campaign",
                                    "campaign_id": self.campaign,
                                    "field_name": 'state',
                                    "field_old_value": "active",
                                    "field_new_value": "inactive",
                                    "metric_values": {}
                                }
                self.logger.info(deactivate_log)
                self.push_log(deactivate_log)

            print "\n"

            time.sleep(3)







