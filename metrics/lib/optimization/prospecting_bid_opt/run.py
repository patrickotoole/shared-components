import sys
sys.path.append("../../bidder/")
sys.path.append("../opt_script/")

sys.path.append("../../")
import buffering_smtp_handler
import logging

from options import define, options, parse_command_line, options_to_dict
import pandas as pd
import datasource 
import analysis
import action
import helpers
from link import lnk
import json
import pprint
from datetime import datetime, timedelta

class Runner():

    def __init__(self, params):
                
        self.start_date = params['start_date']
        self.end_date = params['end_date']
        self.external_adv_id = params['external_advertiser_id']     
        self.campaigns = params['campaigns']
        self.params = params

    def run(self):

        D = datasource.CampaignDataSource(self.external_adv_id, self.campaigns)
        D.pull(self.start_date, self.end_date)
        D.run(self.params)

        Analysis = analysis.CampaignAnalysis(D.df)
        Analysis.run_analysis()
        
        Action = action.CampaignAction(Analysis.to_run, self.params)
        Action.run()



logger = logging.getLogger("opt")

if __name__ == "__main__":
    import logsetup
    logsetup.configure_log(subject="prospecting_bid_opt")

    configs = helpers.get_configs("prospecting_bid_opt")

    datatypes = {
        "learn_total_imps_limit": int,
        "learn_daily_imps_limit": int,
        "learn_daily_cpm_limit": float,
        "learn_max_bid_limit": float,
        "increase_max_bid_by": float,
        "loss_limit": float,
        'imps_loaded_cutoff': int,
        'imps_served_cutoff': int,
        'visible_ratio_cutoff': float,
        'loaded_ratio_cutoff': float
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

    for config_name, params in configs.iteritems():

        if config_name == "citi_yoshi":
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

            logger.info("Starting prospecting_bid_opt with %s" %config_name)
            logger.info(pprint.pformat(params))
            runner = Runner(params)
            runner.run()

            logger.info("prospecting_bid_opt FINISHED SUCCESSFULLY with config %s\n\n\n" %config_name)


