import pandas as pd
import sys
sys.path.append("../../bidder/")

sys.path.append("../../")
import buffering_smtp_handler
import logging

from options import define, options, parse_command_line
from datetime import datetime
import datasource 
import analysis
import action
from link import lnk
import json
api = lnk.api.rockerbox

class Runner():

    def __init__(self, options):
        
        self.start_date = options.start_date
        self.end_date = options.end_date
        self.advertiser = options.advertiser
        self.external_adv_id = options.external_adv_id
        
        #self.campaigns = options.campaigns

        r = api.get("/opt_campaigns?script_name=bigstock_placement_opt")
        if len(r.json) > 0:
            self.campaigns = pd.DataFrame(r.json)['campaign_id'].get_values()
        else:
            self.campaigns = []

        self.params = {}
        self.params['RPA'] = options.RPA
        self.params['RPA_multipliers'] = options.RPA_multipliers
        self.params['loss_limits'] = options.loss_limits
        self.params['imps_served_cutoff'] = options.imps_served_cutoff
        self.params['CTR_cutoff']  = options.CTR_cutoff
        self.params['served_ratio_cutoff']  = options.served_ratio_cutoff
        self.params['loaded_ratio_cutoff']  = options.loaded_ratio_cutoff

    def run(self):
        D = datasource.PlacementDataSource(self.external_adv_id, self.advertiser, self.campaigns)
        D.pull(self.start_date, self.end_date)

        A = action.PlacementAction()

        for campaign in self.campaigns:

            D.reshape(campaign)
            D.transform(self.params)
            D.filter()

            P = analysis.PlacementAnalysis(D.df)
            P.run_analysis()

            A.run(P.to_run, campaign)


if __name__ == "__main__":
    import logsetup
    logsetup.configure_log(subject="placement_opt")

    define("start_date", type = str, required = True, help = "start date for placement optimization")
    define("end_date", type = str, required = False, help = "end date for placement optimization")

    options.end_date = datetime.today().strftime('%Y-%m-%d')

    define("advertiser", type = str, required = True, help = "advertiser pixel_source_name")

    define("external_adv_id", type = str, required = True, help = "external advertiser id")
    #define("campaigns", type = int, required = True, multiple = True, help = "list of campaign ID's")
    define("script_name", type = str, required = True, help = "campaign list name in opt_campaigns")

    
    define("RPA", type = int, required = True, help = "Revenue Per Acquisition")
    define("RPA_multipliers", type = int, required = True, multiple = True, help = "mulitplier for RPA")
    define("loss_limits", type = int, required = True, multiple = True, help = "max loss limits for placement")
    define("imps_served_cutoff", type = int, required = True, help = "Imps Served cut-off")
    define("CTR_cutoff", type = float, required = True, help = "Click-thru rate cut-off")
    define("served_ratio_cutoff", type = float, required = True, help = "Appenxus served / Rbox cut-off")
    define("loaded_ratio_cutoff", type = float, required = True, help = "Imps Loaded/Served cut-off")


    # Get command line arguments
    parse_command_line()

    runner = Runner(options)
    runner.run()


