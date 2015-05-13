import sys
sys.path.append("../")
from opt_script import DataSource
import numpy as np
from numpy import dtype
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import time

CONV_DATA_QUERY = '''
Select conversion_time, imp_time, pixel_id, pc, 
campaign_id, campaign_name, user_id, creative_id, line_item_id
From v2_conversion_reporting 
Where date(conversion_time) >= "%(start_date)s" AND date(conversion_time) <= "%(end_date)s" 
AND external_advertiser_id = %(external_advertiser_id)s 
AND deleted = 0 and active = 1 AND is_valid = 0
'''

CONV_DATA_DTYPES = {'user_id': dtype('O'), 'pixel_id': dtype('int64'), 
        'creative_id': dtype('int64'), 'campaign_id': dtype('int64'), 
        'imp_time': dtype('<M8[ns]'), 'pc': dtype('int64'), 
        'conversion_time': dtype('<M8[ns]'), 
        'campaign_name': dtype('O'), 'line_item_id': dtype('int64')}


REPORTING_DATA_QUERY = '''
SELECT date, imps, clicks, (media_cost + adx_spend*.17) AS media_cost, 
creative_id, campaign_id
FROM v4_reporting 
WHERE date(date) >= "%(start_date)s" AND date(date)  <= "%(end_date)s" AND 
external_advertiser_id = %(external_advertiser_id)s AND deleted = 0 and active = 1
'''

REPORTING_DATA_DTYPES = {'imps': dtype('int64'), 
                    'creative_id': dtype('int64'), 
                    'campaign_id': dtype('int64'), 
                    'media_cost': dtype('float64'), 
                    'date': dtype('<M8[ns]'), 
                    'clicks': dtype('int64')}

PARAM_KEYS = ['learn_max_bid_limit', 'learn_total_imps_limit', 'learn_daily_imps_limit', 'learn_daily_cpm_limit']


class CampaignDataSource(DataSource):

    def __init__(self, external_adv_id, campaigns):
        
        self.external_adv_id = external_adv_id
        self.campaigns = campaigns

        self.conv_data = None
        self.reporting_data = None


    def pull_rbox_data(self):
        query_args = {  'start_date': self.start_date,
                        'end_date': self.end_date,
                        'external_advertiser_id': self.external_adv_id }
        try:
            self.reporting_data = self.reporting.select_dataframe(REPORTING_DATA_QUERY % query_args)
        except AttributeError:
            raise AttributeError("Issue with reporting query")

        try:
            self.conv_data = self.reporting.select_dataframe(CONV_DATA_QUERY % query_args)
        except AttributeError:
            raise AttributeError("Issue with conv query")


    def check_data(self):

        if self.reporting_data is None:
            raise Exception('Empty DataFrame for reporting_data')

        elif self.conv_data is None:
            raise Exception('Empty DataFrame for conv_data')

        elif len(self.reporting_data) == 0:
            raise Exception('Empty DataFrame for reporting_data')

        elif len(self.reporting_data) == 0:
            raise Exception('Empty DataFrame for conv_data')

        elif self.reporting_data.dtypes.to_dict() !=  REPORTING_DATA_DTYPES:
            raise TypeError("Incorrect column types for reporting_data") 

        elif self.conv_data.dtypes.to_dict() != CONV_DATA_DTYPES:
            raise TypeError("Incorrect column types for conv_data")

        
    def pull(self, start_date, end_date):
        try:
            datetime.strptime(end_date, "%Y-%m-%d")
            datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError("incorrect start_date/end_date string format %s %s" %(start_date, end_date))

        self.start_date = start_date
        self.end_date = end_date
        self.pull_rbox_data()
        self.check_data()
        
    def aggregate_reporting(self, x):
        x = x.sort('date')
        cols = {'imps_served_total': x['imps'].sum(),
                'clicks': x['clicks'].sum(),
                'media_cost': x['media_cost'].sum(),
                'imps_served_daily': x['imps'].tail(3).mean(),
                'CPM_daily': x['imps'].tail(3).mean(),
                'last_served_date': str(x['date'].max().date())
                }
        return cols

    def aggregate_conv(self, x):
        x = x.sort('conversion_time')
        cols = {'attr_conv': len(x),
                'attr_conv_pc': x['pc'].sum()
                }
        return cols


    def get_max_bid(self, campaign_id):
        response = self.console.get("/campaign?id=%s"%campaign_id).json            
        if response['response']['campaign']['max_bid'] is None:
            max_bid = np.nan
        else:
            max_bid = response['response']['campaign']['max_bid']
        return max_bid


    def add_max_bids(self):

        max_bids = [None] * len(self.df)
        for k in range(len(self.df)):
            campaign_id = self.df.index[k]
            max_bids[k] = self.get_max_bid(campaign_id)
            time.sleep(3)
        self.df['max_bid'] = max_bids

    def reshape(self):

        reporting_grouped = self.reporting_data.groupby('campaign_id')
        rep_by_campaign = reporting_grouped.apply(lambda x: pd.Series(self.aggregate_reporting(x)))
        
        conv_grouped = self.conv_data.groupby('campaign_id')
        conv_by_campaign = conv_grouped.apply(lambda x: pd.Series(self.aggregate_conv(x)))
        
        merged = pd.merge(rep_by_campaign, conv_by_campaign, 
                        left_index = True, right_index = True, 
                        how = 'outer').fillna(0)
        self.df = merged


    def run(self, params):
        self.reshape()
        self.add_max_bids()
        self.check_params(params)
        self.transform(params)
        self.filter()

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

        self.df['learn_total_imps_limit'] = params['learn_total_imps_limit']
        self.df['learn_daily_imps_limit'] = params['learn_daily_imps_limit']
        self.df['learn_daily_cpm_limit'] = params['learn_daily_cpm_limit']
        self.df['learn_max_bid_limit'] = params['learn_max_bid_limit']



    def filter(self):

        self.df = self.df[self.df['last_served_date'] >= self.end_date]



