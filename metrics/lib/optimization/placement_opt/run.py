
from options import define, options, parse_command_line

import datasource 
import analysis
import action

class Runner():
    def __init__(self, options):
        
        self.start_date = options.start_date
        self.end_date = options.end_date
        self.external_adv_id = options.external_adv_id
        self.campaigns = options.campaigns

        self.params = {}
        self.params['RPA'] = options.RPA
        self.params['RPA_multipliers'] = options.RPA_multipliers
        self.params['loss_limits'] = options.loss_limits
        self.params['imp_served_cutoff'] = options.imp_served_cutoff
        self.params['CTR_cutoff']  = options.CTR_cutoff

    def run():
        D = datasource.PlacementDataSource(self.external_adv_id, self.campaigns)
        D.pull(self.start_date, self.end_date)

        for campaign in self.campaigns:

            D.reshape(campaign)
            D.transform(self.params)
            D.filter()

            P = analysis.PlacementAnalysis(D.df)
            P.analyze()
            P.reshape()

            A = action.PlacementAction(P.to_run, campaign)
            A.actions()



if __name__ == "__main__":

    define("start_date", type = str, require = True, help = "start date for placement optimization")
    define("end_date", type = str, require = True, help = "start date for placement optimization")

    define("external_adv_id", type = str, require = True, help = "external advertiser id")
    define("campaigns", type = list, require = True, help = "list of campaign ID's")
    define("RPA", type = int, require = True, help = "Revenue Per Acquisition")
    define("RPA_multipliers", type = list, require = True, help = "mulitplier for RPA")
    define("loss_limits", type = list, require = True, help = "max loss limits for placement")
    define("imp_served_cutoff", type = int, require = True, help = "Imps Served cut-off")
    define("CTR_cutoff", type = float, require = True, help = "Click-thru rate cut-off")


    # Get command line arguments
    parse_command_line()

    runner = Runner(options)
    runner.run()


