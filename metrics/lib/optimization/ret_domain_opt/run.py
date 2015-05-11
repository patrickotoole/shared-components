import sys
sys.path.append("../../bidder/")
sys.path.append("../opt_script/")
from options import define, options, parse_command_line
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

    def __init__(self, options):
        print options
        self.start_date = options["start_date"]
        self.end_date = options["end_date"]
        self.advertiser = options["advertiser"]
        self.external_adv_id = options["external_adv_id"]
        self.campaigns = options["campaigns"]

        self.params = options

    def run(self):
        D = datasource.DomainDataSource(self.external_adv_id, self.advertiser, self.campaigns)
        D.pull(self.start_date, self.end_date)
        
        A = action.DomainAction()
        
        for campaign in self.campaigns:
            D.run(campaign, self.params)
            
            P = analysis.DomainAnalysis(D.df)
            P.run_analysis()
            A.run(P.to_run, campaign)


if __name__ == "__main__":
    configs = helpers.get_configs("retargeting_domain_opt")

    datatypes = {
        "imps_served_cutoff": int,
        "imps_loaded_cutoff": int,
        "loaded_ratio_cutoff": float,
        "visible_ratio_cutoff": float,
        "served_ratio_cutoff": float
    }

    for config_name, params in configs.iteritems():
        print config_name
        if "start_date" not in params:
            params["start_date"] = (datetime.today() - timedelta(days = 7)).strftime('%Y-%m-%d')

        if "end_date" not in params:
            params["end_date"] = datetime.today().strftime('%Y-%m-%d')

        # Convert params to correct datatypes
        for param in params:
            if param in datatypes:
                params[param] = datatypes[param](params[param])

        runner = Runner(params)
        runner.run()
