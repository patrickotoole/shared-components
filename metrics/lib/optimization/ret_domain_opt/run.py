import sys
sys.path.append("../../bidder/")
from options import define, options, parse_command_line
import pandas as pd
import datasource 
import analysis
import action
from link import lnk
import json
from datetime import datetime, timedelta

api = lnk.api.rockerbox


class Runner():

    def __init__(self, options):
        
        self.start_date = options.start_date
        self.end_date = options.end_date
        self.advertiser = options.advertiser
        self.external_adv_id = options.external_adv_id
        #self.campaigns = options.campaigns

        ## Grabbing campaigns
        r = api.get("/opt_campaigns?script_name=%s"%options.script_name)
        if len(r.json) > 0:
            self.campaigns = pd.DataFrame(r.json)['campaign_id'].get_values()
        else:
            self.campaigns = []

        self.params = {}

        self.params['imps_served_cutoff'] = options.imps_served_cutoff
        self.params['imps_loaded_cutoff'] = options.imps_loaded_cutoff

        self.params['loaded_ratio_cutoff'] = options.loaded_ratio_cutoff
        self.params['visible_ratio_cutoff'] = options.visible_ratio_cutoff
        self.params['served_ratio_cutoff'] = options.served_ratio_cutoff


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

    define("start_date", type = str, required = False, help = "start date for placement optimization")
    define("end_date", type = str, required = False, help = "end date for placement optimization")

    if not options.end_date:
        options.start_date = (datetime.today() - timedelta(days = 7)).strftime('%Y-%m-%d')

    if not options.end_date:
        options.end_date = datetime.today().strftime('%Y-%m-%d')

    define("advertiser", type = str, required = True, help = "advertiser pixel_source_name")

    define("external_adv_id", type = str, required = True, help = "external advertiser id")
    # define("campaigns", type = int, required = True, multiple = True, help = "list of campaign ID's")
    define("script_name", type = str, required = True, help = "campaign list name in opt_campaigns")

    define("imps_served_cutoff", type = int, required = True, help = "Imps Served cut-off")
    define("imps_loaded_cutoff", type = int, required = True, help = "Imps Loaded cut-off")

    define("loaded_ratio_cutoff", type = float, required = True, help = "Domain Loaded/Served Ratio Cutoff")
    define("visible_ratio_cutoff", type = float, required = True, help = "Domain Visibility Cutoff")
    define("served_ratio_cutoff", type = float, required = True, help = "Appenxus served / Rbox cut-off")

    # Get command line arguments
    parse_command_line()

    runner = Runner(options)
    runner.run()


