import sys
sys.path.append("../../bidder/")
sys.path.append("../opt_script/")
from options import define, options, parse_command_line, options_to_dict
import pandas as pd
import datasource 
import analysis
import action
import helpers
from link import lnk
import json
from datetime import datetime, timedelta


class Runner():

    def __init__(self, params):
                
        self.start_date = params['start_date']
        self.end_date = params['end_date']
        #self.advertiser = params['advertiser']
        self.external_adv_id = params['external_advertiser_id']     
        self.campaigns = params['campaigns']
        self.params = params

    def run(self):

        D = datasource.CampaignDataSource(self.external_adv_id, None)
        D.pull(self.start_date, self.end_date)
        D.run(self.params)

        Analysis = analysis.CampaignAnalysis(D.df)
        Analysis.run_analysis()
        
        Action = action.CampaignAction(Analysis.to_run, self.params)
        Action.run()


if __name__ == "__main__":

    configs = helpers.get_configs("prospecting_bid_opt")

    datatypes = {
        "learn_total_imps_limit": int,
        "learn_daily_imps_limit": int,
        "learn_daily_cpm_limit": float,
        "learn_max_bid_limit": float,
        "increase_max_bid_by": float
    }

    define("start_date", type = str, required = False, help = "start date for campaign bid/budget optimization")
    define("end_date", type = str, required = False, help = "end date for campaign bid/budget optimization")
    define("external_adv_id", type = str, required = False, help = "external advertiser id")
    
    define("learn_total_imps_limit", type = int, required = False)
    define("learn_daily_imps_limit", type = int, required = False)
    define("learn_daily_cpm_limit", type = float, required = False)
    define("learn_max_bid_limit", type = float, required = False)
    define("increase_max_bid_by", type = float, required = False)
    define("campaigns", type = int, required = False, multiple = True, help = "list of campaign ID's")

    # Get command line arguments
    parse_command_line()

    command_line_args = options_to_dict(options)

    print configs
    for config_name, params in configs.iteritems():

        if "end_date" not in params:
            params["end_date"] = datetime.today().strftime('%Y-%m-%d')

        # Convert params to correct datatypes
        for param in params:
            if param in datatypes:
                params[param] = datatypes[param](params[param])

            # If we passed a specific value via command line, overwrite the 
            # parameter value
            if param in command_line_args and command_line_args[param]:
                params[param] = command_line_args[param]

        runner = Runner(params)
        runner.run()


# python run.py --external_adv_id=430556 --advertiser=citi --start_date="2015-05-01" --end_date="2015-05-11" --learn_total_imps_limit=1000 --learn_daily_imps_limit=1000 --learn_daily_cpm_limit=4 --learn_max_bid_limit=8"


