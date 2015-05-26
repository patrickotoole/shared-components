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
from datetime import datetime, timedelta

api = lnk.api.rockerbox

class Runner():

    def __init__(self, params):
        print params
        self.start_date = params["start_date"]
        self.end_date = params["end_date"]
        self.advertiser = params["advertiser"]
        self.external_adv_id = params["external_adv_id"]
        self.campaigns = params["campaigns"]

        self.params = params

    def run(self):
        D = datasource.DomainDataSource(self.external_adv_id, self.advertiser, self.campaigns)
        D.pull(self.start_date, self.end_date)
        
        A = action.DomainAction()
        

        for campaign in self.campaigns:
            D.run(campaign, self.params)
            P = analysis.DomainAnalysis(D.df)
            P.run_analysis()
            A.run(P.to_run, campaign)


logger = logging.getLogger("opt")

if __name__ == "__main__":
    import logsetup
    logsetup.configure_log(subject="ret_domain_opt")

    configs = helpers.get_configs("retargeting_domain_opt")

    datatypes = {
        "imps_served_cutoff": int,
        "imps_loaded_cutoff": int,
        "loaded_ratio_cutoff": float,
        "visible_ratio_cutoff": float,
        "served_ratio_cutoff": float
    }

    define("start_date", type = str, required = False, help = "start date for placement optimization")
    define("end_date", type = str, required = False, help = "end date for placement optimization")

    define("advertiser", type = str, required = False, help = "advertiser pixel_source_name")

    define("external_adv_id", type = str, required = False, help = "external advertiser id")
    define("campaigns", type = int, required = False, multiple = True, help = "list of campaign ID's")
    define("script_name", type = str, required = False, help = "campaign list name in opt_campaigns")

    define("imps_served_cutoff", type = int, required = False, help = "Imps Served cut-off")
    define("imps_loaded_cutoff", type = int, required = False, help = "Imps Loaded cut-off")

    define("loaded_ratio_cutoff", type = float, required = False, help = "Domain Loaded/Served Ratio Cutoff")
    define("visible_ratio_cutoff", type = float, required = False, help = "Domain Visibility Cutoff")
    define("served_ratio_cutoff", type = float, required = False, help = "Appenxus served / Rbox cut-off")

    # Get command line arguments
    parse_command_line()

    command_line_args = options_to_dict(options)

    for config_name, params in configs.iteritems():

        if "start_date" not in params:
            params["start_date"] = (datetime.today() - timedelta(days = 7)).strftime('%Y-%m-%d')

        if "end_date" not in params:
            params["end_date"] = datetime.today().strftime('%Y-%m-%d')

        # Convert params to correct datatypes
        for param in params:
            if param in datatypes:
                params[param] = datatypes[param](params[param])

            # If we passed a specific value via command line, overwrite the 
            # paramater value
            if param in command_line_args and command_line_args[param]:
                params[param] = command_line_args[param]
                
        logger.info(config_name)
        logger.info(params)
        runner = Runner(params)
        runner.run()

        logger.info("prospecting_bid_opt finished successfully with config %s" %config_name)

    logging.shutdown()

