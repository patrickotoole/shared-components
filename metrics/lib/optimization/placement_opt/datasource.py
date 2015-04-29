import sys
sys.path.append("../")
from opt_script import DataSource
import numpy as np
from numpy import dtype
import pandas as pd
from datetime import datetime, timedelta

APNX_COL_TYPES = {   
            'imps': dtype('int64'), 
            'hour': dtype('O'), 
            'total_convs': dtype('int64'), 
            'total_revenue': dtype('float64'), 
            'placement_id': dtype('int64'), 
            'campaign_id': dtype('int64'), 
            'clicks': dtype('int64'), 
            'media_cost': dtype('float64'), 
            'seller_member': dtype('O'), 
            'day': dtype('O')
        }

RBOX_COL_TYPES = {  
                'loaded': dtype('int64'), 
                'tag': dtype('O'), 
                'imps_served': dtype('int64'),
                'campaign': dtype('O')
                }

PARAM_KEYS = [  'loss_limits','RPA_multipliers', 'RPA', 
                'imps_served_cutoff', 'CTR_cutoff','served_ratio_cutoff',
                'loaded_ratio_cutoff'
            ]

REPORT = """
{ 
    "report": { 
        "report_type":"advertiser_analytics", 
        "columns": [ 
            "hour",
            "day",
            "seller_member", 
            "placement_id", 
            "campaign_id", 
            "imps", 
            "clicks", 
            "total_convs",
            "media_cost",
            "total_revenue"
        ], 
         "start_date": "%(start_date)s",
        "end_date": "%(end_date)s", 
        "format":"csv" 
    } 
}
"""

HIVE_QUERY = """
SELECT campaign, tag,  sum(num_served) as imps_served, sum(num_loaded) as loaded 
FROM advertiser_visibility_daily 
WHERE date >= "%(start_date)s" AND date <= "%(end_date)s" AND advertiser = "%(advertiser)s"
GROUP BY campaign, domain, tag
HAVING imps_served > 100
"""



class PlacementDataSource(DataSource):

    def __init__(self, external_adv_id, advertiser, campaigns):
        self.campaigns = campaigns
        self.external_adv_id = external_adv_id
        self.advertiser = advertiser
        self.data = None
        self.df = None


    def pull_apnx_data(self):

        query_args = {
            "start_date" : self.start_date,
            # Adding a day to end_date
            # Appnexus returns the reporting data up to the day before end date
            # This lets us get all data in our date range
            "end_date" : (datetime.strptime(self.end_date, "%Y-%m-%d") + timedelta(days = 1)).strftime("%Y-%m-%d")
            }

        query = REPORT % query_args

        self.logger.info("Executing query: {}".format(query))
        try:
            self.apnx_data = self.reporting_api.get_report(self.external_adv_id, query)
            self.logger.info("Pulled DataFrame with {} rows and {} columns".format(len(self.apnx_data), len(self.apnx_data.columns.tolist())))

        except Exception:
            raise Exception("Reporting error")


    def pull_rbox_data(self):

        query_args = {  'start_date': self.start_date[2:] ,
                        'end_date':self.end_date[2:],
                        'advertiser':self.advertiser
                    }

        self.logger.info("Executing query: {}".format(HIVE_QUERY))
        try:
            df_rbox = pd.DataFrame(self.hive.execute(HIVE_QUERY % query_args))
            self.rbox_data = df_rbox
        except Exception:
            raise Exception("Incorrect Hive query")



    def pull(self, start_date, end_date):
        try:
            datetime.strptime(end_date, "%Y-%m-%d")
            datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError("incorrect start_date/end_date string format %s %s" %(start_date, end_date))

        self.start_date = start_date
        self.end_date = end_date

        self.pull_apnx_data()
        self.pull_rbox_data()


    def aggregrate_all(self, grouped_df):

        reshaped_df = grouped_df.apply(lambda x: pd.Series({'last_served_date':max(x['day']), 
                            'num_days':len(set(x['day'])),
                            'imps_served': x['imps'].sum(),
                            'convs': x['total_convs'].sum(),
                            'clicks': x['clicks'].sum(),
                            'media_cost': x['media_cost'].sum(),
                            'revenue': x['total_revenue'].sum(),
                            'profit': x['total_revenue'].sum() - x['media_cost'].sum()
                            } ))
        return reshaped_df


    def reformat_cols(self):

        self.rbox_data = self.rbox_data.rename(columns={'campaign': 'campaign_id'})
        self.apnx_data['campaign_id'] = self.apnx_data['campaign_id'].astype(str)
        self.rbox_data['campaign_id'] = self.rbox_data['campaign_id'].astype(str)
        self.apnx_data['placement_id'] = self.apnx_data['placement_id'].astype(str)
        self.rbox_data['tag'] = self.rbox_data['tag'].astype(str)


    def reshape(self, campaign):

        self.logger.info("On campaign %s" %campaign)

        if self.apnx_data is None:
            raise Exception('Empty DataFrame')

        elif self.rbox_data is None:
            raise Exception('Empty DataFrame')

        elif self.apnx_data.dtypes.to_dict() !=  APNX_COL_TYPES:
            raise TypeError("Incorrect column types for self.apnx_data") 

        elif self.rbox_data.dtypes.to_dict() != RBOX_COL_TYPES:
            raise TypeError("Incorrect column types for self.rbox_data")
            
        try:
            datetime.strptime(self.apnx_data['day'].iloc[0], "%Y-%m-%d")
        except ValueError:
            raise ValueError("Incorrect date string format %s" %self.apnx_data['day'].iloc[0])

        self.reformat_cols()

        apnx_campaign_df = self.apnx_data[self.apnx_data['campaign_id'] == str(campaign)]
        rbox_campaign_df = self.rbox_data[self.rbox_data['campaign_id'] == str(campaign)]

        apnx_grouped_df = apnx_campaign_df.groupby('placement_id')
        apnx_reshaped_df = self.aggregrate_all(apnx_grouped_df)

        rbox_reshaped_df = rbox_campaign_df.drop('campaign_id', axis = 1)
        rbox_reshaped_df = rbox_reshaped_df.groupby('tag').sum()

        reshaped_both = pd.merge(apnx_reshaped_df, rbox_reshaped_df,
                                suffixes = ("_apnx", "_rbox"),
                                left_index = True, right_index = True, 
                                how = "outer")
        reshaped_both = reshaped_both.fillna(0)
        self.df = reshaped_both

    def check_params(self, params):

        if not all (k in params for k in PARAM_KEYS):

            # if params != {}:
                
            #     for k in PARAM_KEYS:
            #         if k not in params:
            #             print k
            #     import ipdb
            #     ipdb.set_trace()
            raise ValueError("params missing necessary keys")

        elif len(params['RPA_multipliers']) < 3:
            raise ValueError("RPA_multipliers must have 3 values")

        elif len(params['loss_limits']) < 3:
            raise ValueError("loss_limits must have 3 values")

        elif not all(isinstance(item, (int, float)) for item in params['RPA_multipliers']):
            raise TypeError("")

        elif not all(isinstance(item, (int, float)) for item in params['loss_limits']):
            raise TypeError("")

        elif type(params['RPA']) != int and type(params['RPA']) != float:
            raise TypeError("RPA is wrong type")

        elif type(params['imps_served_cutoff']) != int and type(params['imps_served_cutoff']) != float:
            raise TypeError("imps_served_cutoff is wrong type")

        elif type(params['CTR_cutoff']) != int and type(params['CTR_cutoff']) != float:
            raise TypeError("CTR_cutoff is wrong type")

        elif params['RPA'] < 0:
            raise AttributeError("Inputs cannot be negative")

        elif params['imps_served_cutoff'] < 0:
            raise AttributeError("Inputs cannot be negative")

        elif params['CTR_cutoff'] < 0:
            raise AttributeError("Inputs cannot be negative")

        elif params['served_ratio_cutoff'] < 0:
            raise AttributeError("Inputs cannot be negative")

        elif params['loaded_ratio_cutoff'] < 0:
            raise AttributeError("Inputs cannot be negative")

    def transform(self, params):

        self.check_params(params)

        if len(self.df) > 0:

            self.df['CTR'] = self.df['clicks'] / self.df['imps_served_apnx'].astype(float)
            self.df['RPA'] = params['RPA'] 
            self.df['loss_limit'] = self.df['convs'].apply(lambda x: params['loss_limits'][0] if x == 0 else (params['loss_limits'][1] if x == 1 else params['loss_limits'][2]))
            self.df['RPA_multiplier'] = self.df['convs'].apply(lambda x: params['RPA_multipliers'][0] if x == 0 else (params['RPA_multipliers'][1] if x == 1 else params['RPA_multipliers'][2]))
            self.df['imps_served_cutoff'] = params['imps_served_cutoff']
            self.df['CTR_cutoff'] = params['CTR_cutoff']
            self.df['loaded_ratio'] = self.df['loaded'] / self.df['imps_served_rbox'].astype(float)
            self.df['apnx_rbox_served_ratio'] = self.df['imps_served_rbox'] / self.df['imps_served_apnx'].astype(float)
            self.df['served_ratio_cutoff'] = params['served_ratio_cutoff']
            self.df['loaded_ratio_cutoff'] = params['loaded_ratio_cutoff']

        else:
            self.logger.info("no data for campaign")


    def filter(self):
        if len(self.df) > 0:
            self.df = self.df[self.df['last_served_date'] >= self.end_date]





