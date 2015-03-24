import sys
sys.path.append("../")
from opt_script import Action

class ActionExample(Action):
    def __init__(self, results):
        self.results = results
    
    def actions(self):
        if "visibility" in self.results:
            self.ban_tag_action(self.results["visibility"])

    @Action.verify_param_cols(["campaign", "tag", "num_served", "percent_visible"])
    def ban_tag_action(self, df):
        # Pull out list of unique campaigns
        campaigns = set(df.campaign.tolist())
        
        for c in campaigns:
            self.logger.info("Taking actions on {}".format(c))

            # NOTE: THIS IS JUST A NON-WORKING EXAMPLE OF A LOG AND SUBMIT CALL
            #
            # See http://rdev:8889/notebooks/datascience-will/Optimization%20APIs.ipynb
            # for working exmaples
            log = {
                "rule_group_id": 6,
                "field_old_value": "active",
                "field_new_value": "inactive",
                "campaign_id": 7318310,
                "object_modified": "campaign",
                "field_name": "state",
                "metric_values": {
                    "metric1": 29348,
                    "metric2": 123.0129
                    }
                }
            self.rockerbox.post("/scripts/opt_log", data=json.dumps(log))
