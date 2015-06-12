import sys
sys.path.append("../")
from opt_script import DataSource
import numpy as np
from numpy import dtype
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import time
import requests

CONV_DATA_QUERY = '''
Select conversion_time, imp_time, pixel_id, pc, 
campaign_id, campaign_name, user_id, creative_id, line_item_id, is_valid
From v2_conversion_reporting 
Where date(conversion_time) >= "%(start_date)s" AND date(conversion_time) <= "%(end_date)s" 
AND external_advertiser_id = %(external_advertiser_id)s 
AND deleted = 0 and active = 1
'''

CONV_DATA_DTYPES = {'user_id': dtype('O'), 'pixel_id': dtype('int64'), 
        'creative_id': dtype('int64'), 'campaign_id': dtype('int64'), 
        'imp_time': dtype('<M8[ns]'), 'pc': dtype('int64'), 
        'conversion_time': dtype('<M8[ns]'), 
        'campaign_name': dtype('O'), 'line_item_id': dtype('int64'),
        'is_valid': dtype('int64')}


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

VISIBILITY_QUERY = '''
SELECT campaign,
SUM(num_served) as num_served, SUM(num_loaded) as num_loaded, SUM(num_visible) as num_visible
FROM
(
    SELECT campaign, num_served, num_loaded, num_visible
    FROM advertiser_visibility_daily
    WHERE date >= "%(start_date)s" AND date <= "%(end_date)s" AND %(campaign_list)s 
)a
GROUP BY campaign
'''

VISIBILITY_URL = "http://portal.getrockerbox.com/admin/advertiser/viewable/reporting?include=campaign&start_date=%s&end_date=%s&campaign=%s&format=json&meta=none"

VISIBILITY_DATA_DTYPEs = {'loaded': dtype('int64'),
                        'visible': dtype('int64'), 
                        'spent': dtype('float64'), 
                        'campaign': dtype('O'), 
                        'served': dtype('int64')}


PARAM_KEYS = ['learn_max_bid_limit', 'learn_total_imps_limit', 'learn_daily_imps_limit', 'learn_daily_cpm_limit']


def create_campaignlist_str(campaign_list):
    campaign_str = '''( campaign = "%s" '''%str(campaign_list[0])
    for k in range(1, len(campaign_list)):
        campaign_str += '''OR campaign = "%s" '''%str(campaign_list[k])
    campaign_str += ")"
    return campaign_str


class CampaignDataSource(DataSource):

    def __init__(self, external_adv_id, campaigns):
        
        self.external_adv_id = external_adv_id
        self.campaigns = campaigns

        self.conv_data = None
        self.reporting_data = None
        self.visible_data = None


    def pull_rbox_data(self):
        query_args = {  'start_date': self.start_date,
                        'end_date': self.end_date,
                        'external_advertiser_id': self.external_adv_id }
        try:
            self.reporting_data = self.reporting.select_dataframe(REPORTING_DATA_QUERY % query_args)
            self.logger.info("Pulled DataFrame with {} rows and {} columns".format(len(self.reporting_data), len(self.reporting_data.columns.tolist())))
        except AttributeError:
            raise AttributeError("Issue with reporting query")

        try:
            self.conv_data = self.reporting.select_dataframe(CONV_DATA_QUERY % query_args)
            self.logger.info("Pulled DataFrame with {} rows and {} columns".format(len(self.conv_data), len(self.conv_data.columns.tolist())))
        except AttributeError:
            raise AttributeError("Issue with conv query")

    def pull_visibility_data(self):
        self.logger.info("Loading visiblity data (may take long)...")
        self.visible_data = pd.DataFrame()

        run_start_date = (datetime.strptime(self.end_date, '%Y-%m-%d') - timedelta(days = 30)).strftime('%Y-%m-%d')

        for i in range(0, len(self.campaigns), 50):
            campaign_chunk = self.campaigns[i:i + 50]

            campaign_list = create_campaignlist_str(campaign_chunk)
            query_args = {  'start_date': run_start_date[2:],
                            'end_date': self.end_date[2:],
                            'campaign_list': campaign_list }

            self.logger.info("Executing query: {}".format(VISIBILITY_QUERY % query_args))
            try:
                df_vis = pd.DataFrame(self.hive.execute(VISIBILITY_QUERY % query_args))
            except Exception as e:
                self.logger.error("Error in pulling visibility data: {}".format(e))
                df_vis = pd.DataFrame(self.hive.execute(VISIBILITY_QUERY % query_args))

            self.visible_data = pd.concat([self.visible_data, df_vis])



    def check_data(self):

        if self.reporting_data is None:
            raise Exception('Empty DataFrame for reporting_data')

        elif self.conv_data is None:
            raise Exception('Empty DataFrame for conv_data')

        elif len(self.reporting_data) == 0:
            raise Exception('Empty DataFrame for reporting_data')

        elif len(self.reporting_data) == 0:
            raise Exception('Empty DataFrame for conv_data')
        elif len(self.visible_data) == 0:
            raise Exception('Empty DataFrame for visible_data')

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
        self.logger.info("Loading Data ...")
        self.start_date = start_date
        self.end_date = end_date
        self.pull_rbox_data()
        self.pull_visibility_data()
        self.check_data()
        

    def get_campaign_param(self, campaign_id, param):
        self.logger.info("Getting %s for campaign %s" %(param,str(campaign_id)))
        response = self.console.get("/campaign?id=%s"%campaign_id).json
        return repsonse


        # try:
        #     param_value = response['response']['campaign'][param]
        #     return param_value
        # except KeyError as e:
        #     self.logger.error("%s for campaign %s" %(e,campaign_id))
        #     raise KeyError("param %s does not exist" %param)


    def add_max_bids(self):
        
        max_bids = [None] * len(self.df)
        campaign_state = [None] * len(self.df)

        for k in range(len(self.df)):
            campaign_id = self.df.index[k]
            campaign_params = self.get_campaign_param(campaign_id)

            max_bid = campaign_params['response']['campaign']['max_bid']
            if max_bid is None :
                 max_bid = np.nan
            max_bids[k] = max_bid

            campaign_state[k] = campaign_params['response']['campaign']['state']
            time.sleep(3)
        self.df['max_bid'] = max_bids
        self.df['campaign_state'] = campaign_state

        
    # def add_campaign_state(self):
        
    #     self.logger.info("Adding campaign_state...")
    #     campaign_state = [None] * len(self.df)
    #     for k in range(len(self.df)):
    #         campaign_id = self.df.index[k]
    #         campaign_state[k] = self.get_campaign_param(campaign_id, 'state')
    #         time.sleep(10)
            
    #     self.df['campaign_state'] = campaign_state
        
    def run(self, params):
        self.reshape()
        self.filter()
        self.check_params(params)
        self.transform(params)
        self.logger.info("Finished Loading Data\n")
        

    def reshape(self):

        def aggregate_reporting(x):
            x = x.sort('date')
            
            cols = {'imps_served_total': x['imps'].sum(),
                    'clicks': x['clicks'].sum(),
                    'media_cost': x['media_cost'].sum(),
                    'imps_served_daily':  x.groupby(x['date'].apply(lambda x: x.date())).sum()['imps'].tail(3).mean(),
                    'CPM_daily': x.groupby(x['date'].apply(lambda x: x.date())).sum()['media_cost'].tail(3).mean() * 1000 / x.groupby(x['date'].apply(lambda x: x.date())).sum()['imps'].tail(3).mean(),
                    'last_served_date': str(x['date'].max().date())
                    }

            return cols

        def aggregate_conv(x):
            x = x.sort('conversion_time')
            cols = {'total_conv': len(x),
                    'attr_conv': x['is_valid'].sum(), 
                    'attr_conv_pc': x['pc'].sum() 
                    }
            return cols


        reporting_grouped = self.reporting_data.groupby('campaign_id')
        rep_by_campaign = reporting_grouped.apply(lambda x: pd.Series(aggregate_reporting(x)))
        
        conv_grouped = self.conv_data.groupby('campaign_id')
        conv_by_campaign = conv_grouped.apply(lambda x: pd.Series(aggregate_conv(x)))
        
        merged = pd.merge(rep_by_campaign, conv_by_campaign, 
                        left_index = True, right_index = True, 
                        how = 'outer').fillna(0)

        self.visible_data['campaign'] = self.visible_data['campaign'].astype(int)

        merged = pd.merge(merged, self.visible_data.set_index('campaign'), 
                        left_index = True, right_index = True, 
                        how = 'outer').fillna(0)

        self.df = merged
        self.logger.info("DataFrame with {} campaigns".format(len(self.df)))

    def filter(self):

        if self.campaigns != "all":
            self.df = self.df[list(pd.Series(self.df.index).apply(lambda x: x in self.campaigns))]
            self.logger.info("Filtered Dataframe to {} campaigns".format(len(self.df)))


        self.add_max_bids()
        self.add_campaign_state()

        self.df = self.df[self.df['campaign_state'] == "active"]
        self.logger.info("Filtered Dataframe to {} active campaigns".format(len(self.df)))


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
        
        ## Unprofitable campaigns
        self.df['loss_limit'] = params['loss_limit']

        ## Low Visibility
        self.df['visible_ratio'] = self.df['num_visible'] / self.df['num_loaded'].astype(float)
        self.df['loaded_ratio'] = self.df['num_loaded'] / self.df['num_served'].astype(float)
        self.df['imps_loaded_cutoff'] = params['imps_loaded_cutoff']
        self.df['imps_served_cutoff'] = params['imps_served_cutoff']
        self.df['visible_ratio_cutoff'] = params['visible_ratio_cutoff']
        self.df['loaded_ratio_cutoff'] = params['loaded_ratio_cutoff']















