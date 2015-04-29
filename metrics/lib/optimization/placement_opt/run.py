import sys
sys.path.append("../../bidder/")
from options import define, options, parse_command_line

import datasource 
import analysis
import action

class Runner():

    def __init__(self, options):
        
        self.start_date = options.start_date
        self.end_date = options.end_date
        self.advertiser = options.advertiser
        self.external_adv_id = options.external_adv_id
        self.campaigns = options.campaigns

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

        for campaign in self.campaigns:

            D.reshape(campaign)
            D.transform(self.params)
            D.filter()


            P = analysis.PlacementAnalysis(D.df)
            P.run_analysis()

            A = action.PlacementAction(P.to_run, campaign)
            A.actions()



if __name__ == "__main__":

    define("start_date", type = str, required = True, help = "start date for placement optimization")
    define("end_date", type = str, required = True, help = "start date for placement optimization")

    define("advertiser", type = str, required = True, help = "advertiser pixel_source_name")

    define("external_adv_id", type = str, required = True, help = "external advertiser id")
    define("campaigns", type = int, required = True, multiple = True, help = "list of campaign ID's")
    
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


