import sys
sys.path.append("../")
from opt_script import DataSource
# from opt_script import Analysis
import numpy as np
from numpy import dtype
import pandas as pd
from datetime import datetime, timedelta

COL_TYPES = {   
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

PARAM_KEYS = ['loss_limits','RPA_multipliers', 'RPA', 
                'imp_served_cutoff', 'CTR_cutoff']

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


class PlacementDataSource(DataSource):

    def __init__(self, external_adv_id, campaigns):
        self.campaigns = campaigns
        self.external_adv_id = external_adv_id
        self.data = None
        self.df = None

    def pull(self, start_date, end_date):

        try:
            datetime.strptime(end_date, "%Y-%m-%d")
            datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError("incorrect start_date/end_date string format %s %s" %(start_date, end_date))


        self.start_date = start_date
        self.end_date = end_date

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
            self.data = self.reporting_api.get_report(self.external_adv_id, query)
            self.logger.info("Pulled DataFrame with {} rows and {} columns".format(len(self.data), len(self.data.columns.tolist())))

        except Exception:
            raise Exception("Reporting error")

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

    def reshape(self, campaign):

        self.logger.info("On campaign %s" %campaign)

        ## Check if data is not None
        if self.data is None:
            raise Exception('Empty DataFrame')

        ## Check that all columns are correct type
        elif self.data.dtypes.to_dict() !=  COL_TYPES:
            raise TypeError("Incorrect column types")  

        else:
            ## Check day string is in correct format
            try:
                datetime.strptime(self.data['day'].iloc[0], "%Y-%m-%d")
            except ValueError:
                raise ValueError("Incorrect date string format %s" %self.data['day'].iloc[0])

            self.df = self.data[self.data['campaign_id'] == campaign]
            grouped_df = self.df.groupby('placement_id')
            reshaped_df = self.aggregrate_all(grouped_df)
            self.df = reshaped_df

    def transform(self, params):

        if not all (k in params for k in PARAM_KEYS):
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

        elif type(params['imp_served_cutoff']) != int and type(params['imp_served_cutoff']) != float:
            raise TypeError("imp_served_cutoff is wrong type")

        elif type(params['CTR_cutoff']) != int and type(params['CTR_cutoff']) != float:
            raise TypeError("CTR_cutoff is wrong type")

        elif params['RPA'] < 0 or params['imp_served_cutoff'] < 0 or  params['CTR_cutoff'] < 0 :
            raise AttributeError("Inputs cannot be negative")

        else:
            self.df['CTR'] = self.df['clicks'] / self.df['imps_served'].astype(float)
            self.df['RPA'] = params['RPA'] 
            self.df['loss_limit'] = self.df['convs'].apply(lambda x: params['loss_limits'][0] if x == 0 else (params['loss_limits'][1] if x == 1 else params['loss_limits'][2]))
            self.df['RPA_multiplier'] = self.df['convs'].apply(lambda x: params['RPA_multipliers'][0] if x == 0 else (params['RPA_multipliers'][1] if x == 1 else params['RPA_multipliers'][2]))
            self.df['imp_served_cutoff'] = params['imp_served_cutoff']
            self.df['CTR_cutoff'] = params['CTR_cutoff']

    def filter(self):
        self.df = self.df[self.df['last_served_date'] >= self.end_date]




