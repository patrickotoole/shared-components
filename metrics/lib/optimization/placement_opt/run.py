
from options import define, options, parse_command_line

import datasource 
import analysis
import action

class Runner():
    def __init__(self, advertiser, campaigns):
        self.advertiser = advertiser



if __name__ == "__main__":


    campaigns = [7320174]
    external_adv_id = 338195

    RPA = 40
    RPA_multipliers = [0, 0,0]
    loss_limits =[40,800,800]
            
    imp_served_cutoff = 1000
    CTR_cutoff = 0.005

    D = datasource.PlacementDataSource(external_adv_id, campaigns)
    D.pull("2015-04-01","2015-04-02")

    for campaign in campaigns:

        D.reshape(campaign)
        # D.transform(loss_limits, RPA_multipliers, RPA, imp_served_cutoff, CTR_cutoff)
        # D.filter()

        # P = analysis.PlacementAnalysis(D.df)
        # P.analyze()
        # P.reshape()

        # print P.to_run

        # A = action.PlacementAction(P.to_run, campaign)
        # A.actions()
