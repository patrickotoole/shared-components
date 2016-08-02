import numpy as np
from scipy import stats
import random
from link import lnk
import pandas as pd
from datetime import datetime
import math

ALPHA = 10
BETA = 300000

QUANTILE = 0.95

CONV_RATES = '''
SELECT * FROM rockerbox.yoshi_conv_rates WHERE external_advertiser_id = %(external_advertiser_id)s
AND last_modified = (
    SELECT MAX(last_modified) FROM rockerbox.yoshi_conv_rates WHERE external_advertiser_id = %(external_advertiser_id)s
)
'''

ADVERTISERS = '''
SELECT DISTINCT external_advertiser_id
FROM rockerbox.advertiser
WHERE active = 1 AND running = 1 AND media_trader_slack_name is not null
'''


class LBudget_Exponential():

    def __init__(self, external_advertiser_id, db):

        self.prior_params = (ALPHA, BETA)
        self.quantile = QUANTILE
        self.conv_rates = db.select_dataframe(CONV_RATES%{'external_advertiser_id':external_advertiser_id})


    def simulate(self, alpha, Beta, n = 10000):

        samples = []        
        for theta in stats.gamma.rvs(alpha, scale=1./Beta, size=n):
            samples.extend(stats.expon.rvs(scale = 1./theta, size = 10))
        return samples

    def posterior(self, imps):

        alpha_prior = self.prior_params[0]
        Beta_prior = self.prior_params[1]

        alpha_posterior, Beta_posterior  = (alpha_prior + len(imps), Beta_prior + len(imps)*np.mean(imps))

        return alpha_posterior, Beta_posterior

    def run(self):

        if len(self.conv_rates) > 0:

            imps_to_conv = self.conv_rates['imps_to_conv'].tolist()
            alpha_posterior, Beta_posterior = self.posterior(imps_to_conv)

            self.data = pd.DataFrame({
                'data': np.random.choice(imps_to_conv, 10000 * 10),
                'prior': self.simulate(self.prior_params[0], self.prior_params[1], 10000),
                'posterior': self.simulate(alpha_posterior, Beta_posterior, 10000)
            })
            self.imps = self.data['posterior'].quantile(self.quantile)

        else:
            self.imps = 50000

def extract(db):
    data = []

    advertisers = db.select_dataframe(ADVERTISERS)['external_advertiser_id'].tolist()
    assert len(advertisers) > 0
    for a in advertisers:
        L = LBudget_Exponential(a, db)
        L.run()

        data.append({'external_advertiser_id': a, 'lifetime_budget_imps':L.imps})

    data = pd.DataFrame(data)
    assert "external_advertiser_id" in data.columns
    assert "lifetime_budget_imps" in data.columns

    return data

def transform(data):

    data['lifetime_budget_imps'] = data['lifetime_budget_imps'].apply(lambda x: round(x/10000.)*10000)
    data['lifetime_budget_imps'] = data['lifetime_budget_imps'].apply(lambda x: min(x, 100000))
    data['lifetime_budget_imps'] = data['lifetime_budget_imps'].astype(int)
    data['last_modified'] = datetime.now()

    assert "lifetime_budget_imps" in data.columns
    assert "last_modified" in data.columns
    return data


def write_to_sql(db,df):
    from lib.appnexus_reporting.load import DataLoader

    loader = DataLoader(db)
    key = "external_advertiser_id"
    columns = df.columns
    loader.insert_df(df,"yoshi_lifetime_budgets",["external_advertiser_id"],columns)

def run(db):

    data = extract(db)
    data = transform(data)
    write_to_sql(db, data)



if __name__ == "__main__":

    from link import lnk
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line
    from lib.report.utils.loggingutils import basicConfig

    define('console', default=True)
    parse_command_line()
    basicConfig(options=options)
    db = lnk.dbs.rockerbox
    run(db)


