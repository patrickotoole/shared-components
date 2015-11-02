import sys
sys.path.append("../")
from opt_script import DataSource
import numpy as np
from numpy import dtype
import pandas as pd
from datetime import datetime, timedelta
import time

QUERY = '''
SELECT rep.campaign_id, rep.date, rep.imps, rep.clicks, rep.media_cost, v2.total_conv
FROM
(
    SELECT v4.date, ref.campaign_id, v4.imps, v4.clicks, v4.media_cost
    FROM
    (
        SELECT campaign_id FROM rockerbox.advertiser_campaign
        WHERE external_advertiser_id = %(external_advertiser_id)s
    ) as ref
    LEFT JOIN
    (
        SELECT date(date) as date, campaign_id, 
        SUM(imps) as imps, SUM(clicks) as clicks, SUM(media_cost+0.17*adx_spend) as media_cost
        FROM v4_reporting
        WHERE date(date) >= "%(start_date)s" AND date(date) <= "%(end_date)s"
        AND external_advertiser_id = %(external_advertiser_id)s
        AND deleted = 0 AND active = 1
        GROUP BY date(date), campaign_id
    ) as v4
    ON(ref.campaign_id = v4.campaign_id)
) as rep
LEFT JOIN
(
    SELECT date(conversion_time) as date, campaign_id, COUNT(*) as total_conv
    FROM v2_conversion_reporting
    WHERE date(conversion_time) >= "%(start_date)s" AND date(conversion_time) <= "%(end_date)s"
    AND external_advertiser_id = %(external_advertiser_id)s
    AND deleted = 0 AND active = 1
    GROUP BY date(conversion_time), campaign_id
) as v2
ON(v2.campaign_id = rep.campaign_id AND v2.date = rep.date)
'''

REPORTING_DATA_DTYPES = {
        'date': dtype('object'), 
        'campaign_id': dtype('int64'), 
        'imps': dtype('float64'), 
        'clicks': dtype('float64'),
        'media_cost': dtype('float64'),         
        'total_conv': dtype('float64')
}


PARAM_KEYS = ['learn_max_bid_limit', 'learn_total_imps_limit', 'learn_daily_imps_limit', 'learn_daily_cpm_limit']


class CampaignDataSource(DataSource):

    def __init__(self, external_adv_id, campaigns):
        
        self.external_adv_id = external_adv_id
        self.campaigns = campaigns
        self.reporting_data = None

    def pull_rbox_data(self):
        query_args = {  'start_date': self.start_date,
                        'end_date': self.end_date,
                        'external_advertiser_id': self.external_adv_id }
        try:
            self.reporting_data = self.reporting.select_dataframe(QUERY % query_args)
            self.reporting_data = self.reporting_data.fillna(0)
            self.logger.info("Pulled DataFrame with {} rows and {} columns".format(len(self.reporting_data), len(self.reporting_data.columns.tolist())))

        except AttributeError:
            raise AttributeError("Issue with reporting query")

    def check_data(self):
        
        if self.reporting_data is None:
            raise Exception('Empty DataFrame for reporting_data')

        elif len(self.reporting_data) == 0:
            raise Exception('Empty DataFrame for reporting_data')

        elif self.reporting_data.dtypes.to_dict() !=  REPORTING_DATA_DTYPES:
            raise TypeError("Incorrect column types for reporting_data") 
        
    def pull(self, start_date, end_date):
        try:
            datetime.strptime(end_date, "%Y-%m-%d")
            datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError("incorrect start_date/end_date string format %s %s" %(start_date, end_date))
        self.logger.info("Loading Data ...")
        self.start_date = start_date
        self.end_date = end_date
        self.pull_rbox_data()
        self.check_data()

    def get_campaign_param(self, campaign_id):
        self.logger.info("Getting params for campaign %s" %(str(campaign_id)))
        response = self.console.get("/campaign?id=%s"%campaign_id).json

        if 'error' in response['response']:
            if 'request limit' in response['response']['error']:
                self.logger.info("Reached request limit, waiting 5 mins")
                time.sleep(300)
                response = self.console.get("/campaign?id=%s"%campaign_id).json
            else:
                self.logger.error("Unknown error for campaign %s" %campaign_id)
        return response

    def add_campaign_settings(self):
        max_bids = [None] * len(self.df)
        campaign_state = [None] * len(self.df)

        for k in range(len(self.df)):
            campaign_id = self.df.index[k]
            campaign_params = self.get_campaign_param(campaign_id)

            max_bid = campaign_params['response']['campaign']['max_bid']
            max_bids[k] = max_bid

            campaign_state[k] = campaign_params['response']['campaign']['state']
            time.sleep(3)
        self.df['max_bid'] = max_bids
        self.df['campaign_state'] = campaign_state

        
    def run(self, params):
        self.reshape()
        self.filter()
        self.check_params(params)
        self.transform(params)
        self.logger.info("Finished Loading Data\n")
        

    def reshape(self):
        '''
        Reshapes raw data into dataframe of campaign metrics
        '''
        def aggregate(x):
            if x['imps'].sum() > 0:
                x = x.sort('date')
                cols = {'imps_served_total': x['imps'].sum(),
                        'clicks': x['clicks'].sum(),
                        'media_cost': x['media_cost'].sum(),
                        'imps_served_daily':  x.groupby(x['date'].apply(lambda x: x.date())).sum()['imps'].tail(3).mean(),
                        'CPM_daily': x.groupby(x['date'].apply(lambda x: x.date())).sum()['media_cost'].tail(3).mean() * 1000 / x.groupby(x['date'].apply(lambda x: x.date())).sum()['imps'].tail(3).mean(),
                        'last_served_date': str(x['date'].max().date()),
                        'total_conv': x['total_conv'].sum() }
            else:
                cols = { 'imps_served_total':0,
                        'clicks': 0,
                        'media_cost': 0,
                        'imps_served_daily':  0,
                        'CPM_daily': 0,
                        'last_served_date': pd.NaT,
                        'total_conv': 0 }

            return cols

        self.reporting_data = self.reporting_data.fillna(0)

        self.reporting_data['date'].apply(lambda x: pd.NaT if x == 0  else x)
        self.reporting_data['date'] = pd.to_datetime(self.reporting_data['date'], coerce = True)
        rep_by_campaign = self.reporting_data.groupby('campaign_id').apply(lambda x: pd.Series(aggregate(x)))
        rep_by_campaign = rep_by_campaign.fillna(0)
        self.df = rep_by_campaign
        self.logger.info("DataFrame with {} campaigns".format(len(self.df)))

    def filter(self):

        self.df = self.df[list(pd.Series(self.df.index).apply(lambda x: x in self.campaigns))]
        self.logger.info("Filtered Dataframe to {} campaigns".format(len(self.df)))
        self.add_campaign_settings()
        self.df = self.df[self.df['campaign_state'] == "active"]
        self.logger.info("Filtered Dataframe to {} active campaigns".format(len(self.df)))
        self.df = self.df[self.df['max_bid'].apply(lambda x: x is not None)]
        self.logger.info("Filtered Dataframe to {} ECP bidding campaigns".format(len(self.df)))


    def check_params(self, params):

        if not all (k in params for k in PARAM_KEYS):
            raise ValueError("params missing necessary keys")

        elif type(params['learn_total_imps_limit']) != int:
            raise TypeError("learn_total_imps_limit is wrong type")

        elif type(params['learn_daily_imps_limit']) != int:
            raise TypeError("learn_daily_imps_limit is wrong type")

        elif type(params['learn_daily_cpm_limit']) != float:
            raise TypeError("learn_daily_cpm_limit is wrong type")

        elif type(params['learn_max_bid_limit']) != float:
            raise TypeError("learn_max_bid_limit is wrong type")

        elif any(x < 0 for x in list(params.values())):
            raise AttributeError("Inputs cannot be negative")

    
    def transform(self, params):
        

        ## Testing Bid Optimization
        self.df['learn_total_imps_limit'] = params['learn_total_imps_limit']
        self.df['learn_daily_imps_limit'] = params['learn_daily_imps_limit']
        self.df['learn_daily_cpm_limit'] = params['learn_daily_cpm_limit']
        self.df['learn_max_bid_limit'] = params['learn_max_bid_limit']
        
        ## Unprofitable campaigns
        self.df['loss_limit'] = params['loss_limit']

