import pandas as pd
import sys
sys.path.append("../../bidder/")
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
        # self.campaigns = options.campaigns

        self.params = {}
        self.params['learn_total_imps_limit'] = options.learn_total_imps_limit
        self.params['learn_daily_imps_limit'] = options.learn_daily_imps_limit
        self.params['learn_daily_cpm_limit'] = options.learn_daily_cpm_limit
        self.params['learn_max_bid_limit'] = options.learn_max_bid_limit

        self.run_params = {}
        self.run_params['increase_max_bid_by'] = options.increase_max_bid_by

    def run(self):
        D = datasource.CampaignDataSource(self.external_adv_id, self.advertiser, None)
        D.pull(self.start_date, self.end_date)
        D.run(self.params)

        Analysis = analysis.CampaignAnalysis(D.df)
        Analysis.run_analysis()
        
        Action = action.CampaignAction(Analysis.to_run, self.run_params)
        Action.run()


if __name__ == "__main__":

    define("start_date", type = str, required = True, help = "start date for placement optimization")
    define("end_date", type = str, required = False, help = "end date for placement optimization")

    options.end_date = datetime.today().strftime('%Y-%m-%d')

    define("advertiser", type = str, required = True, help = "advertiser pixel_source_name")
    define("external_adv_id", type = str, required = True, help = "external advertiser id")
    # define("campaigns", type = int, required = True, multiple = True, help = "list of campaign ID's")


    define("learn_total_imps_limit", type = int, required = True)
    define("learn_daily_imps_limit", type = int, required = True)
    define("learn_daily_cpm_limit", type = float, required = True)
    define("learn_max_bid_limit", type = float, required = True)

    define("increase_max_bid_by", type = float, required = True)

    # Get command line arguments
    parse_command_line()

    runner = Runner(options)
    runner.run()


# python run.py --external_adv_id=430556 --advertiser=citi --start_date="2015-05-01" --end_date="2015-05-11" --learn_total_imps_limit=1000 --learn_daily_imps_limit=1000 --learn_daily_cpm_limit=4 --learn_max_bid_limit=8"


