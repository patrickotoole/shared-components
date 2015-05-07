import sys
sys.path.append("../")
from opt_script import DataSource
import numpy as np
from numpy import dtype
import pandas as pd
from datetime import datetime, timedelta


PARAM_KEYS = [  'imps_loaded_cutoff', 'loaded_ratio_cutoff', 
                'imps_served_cutoff', 'served_ratio_cutoff', 
                'visible_ratio_cutoff']

APNX_COL_TYPES = {
            'imps': dtype('int64'), 
            'post_click_convs': dtype('int64'), 
            'campaign_id': dtype('O'), 
            'post_view_convs': dtype('int64'), 
            'site_domain': dtype('O'), 
            'day': dtype('O')
            }

RBOX_COL_TYPES = {
            'loaded': dtype('int64'), 
            'domain': dtype('O'), 
            'imps_served': dtype('int64'), 
            'campaign_id': dtype('O'), 
            'visible': dtype('int64')
            }


VIEW_COL_TYPES = {'imps_served': dtype('int64'),
                    'loaded': dtype('int64'), 
                    'visible': dtype('int64')}


REPORT = """
{
    "report":
    {
        "report_type": "site_domain_performance",
        "columns": [
            "day",
            "imps",
            "site_domain",
            "post_click_convs",
            "post_view_convs",
            "campaign_id"
        ],
        "start_date": "%(start_date)s",
        "end_date": "%(end_date)s",
        "format": "csv"
    }
}
"""

HIVE_QUERY = """
SELECT campaign, domain, sum(num_served) as imps_served, 
sum(num_loaded) as loaded, sum(num_visible) as visible 
FROM advertiser_visibility_daily 
WHERE date >= "%(start_date)s" AND date <= "%(end_date)s" AND advertiser = "%(advertiser)s"
GROUP BY campaign, domain
HAVING imps_served > 100
"""


class DomainDataSource(DataSource):

    def __init__(self, external_adv_id, advertiser, campaigns):
        self.campaigns = campaigns
        self.external_adv_id = external_adv_id
        self.advertiser = advertiser
        self.apnx_data = None
        self.rbox_data = None
        self.view_data = None

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

        self.logger.info("Executing query: {}".format(HIVE_QUERY% query_args))
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

        self.logger.info("Start Date: %s" %self.start_date)
        self.logger.info("End Date: %s" %self.end_date)

        self.pull_apnx_data()
        self.pull_rbox_data()
        self.reformat_cols()

    def run(self, campaign, params):

        self.logger.info("On campaign %s" %campaign)
        self.reshape(campaign)
        self.transform(params)
        self.filter()


    def aggregrate_all(self, grouped_df):
        reshaped_df = grouped_df.apply(lambda x: pd.Series({
                                    'last_served_date':max(x['day']),
                                    'convs': x['post_click_convs'].sum() + x['post_view_convs'].sum(),
                                    'imps_served': x['imps'].sum()
                                    } ))
        return reshaped_df

    def reformat_cols(self):
        self.rbox_data = self.rbox_data.rename(columns={'campaign': 'campaign_id'})
        self.apnx_data['campaign_id'] = self.apnx_data['campaign_id'].astype(str)
        self.rbox_data['campaign_id'] = self.rbox_data['campaign_id'].astype(str)

    def reshape(self, campaign):

        if self.apnx_data is None:
            raise Exception('Empty DataFrame')

        elif self.rbox_data is None:
            raise Exception('Empty DataFrame')

        elif self.apnx_data.dtypes.to_dict() !=  APNX_COL_TYPES:
            # import ipdb
            # ipdb.set_trace()
            raise TypeError("Incorrect column types for self.apnx_data") 

        elif self.rbox_data.dtypes.to_dict() != RBOX_COL_TYPES:
            raise TypeError("Incorrect column types for self.rbox_data")

        if len(self.rbox_data) == 0 or len(self.apnx_data) == 0:
            raise Exception('Empty DataFrame')

        try:
            datetime.strptime(self.apnx_data['day'].iloc[0], "%Y-%m-%d")
        except ValueError:
            raise ValueError("Incorrect date string format %s" %self.apnx_data['day'].iloc[0])
        
        

        apnx_campaign_df = self.apnx_data[self.apnx_data['campaign_id'] == str(campaign)]
        rbox_campaign_df = self.rbox_data[self.rbox_data['campaign_id'] == str(campaign)]

        apnx_grouped_df = apnx_campaign_df.groupby('site_domain')
        apnx_reshaped_df = self.aggregrate_all(apnx_grouped_df)

        rbox_reshaped_df = rbox_campaign_df.drop('campaign_id', axis = 1)
        rbox_reshaped_df = rbox_reshaped_df.groupby('domain').sum()

        merged = pd.merge(apnx_reshaped_df, rbox_reshaped_df,
                        suffixes = ("_apnx", "_rbox"),
                        left_index = True, right_index = True, 
                        how = "outer")
        merged = merged.fillna(0)

        self.df = merged

    def check_params(self, params):

        if not all (k in params for k in PARAM_KEYS):
            raise ValueError("params missing necessary keys")

        elif type(params['imps_served_cutoff']) != int:
            raise TypeError("imps_served_cutoff is wrong type")

        elif type(params['imps_loaded_cutoff']) != int:
            raise TypeError("imps_loaded_cutoff is wrong type")

        elif type(params['loaded_ratio_cutoff']) != float:
            raise TypeError("loaded_ratio_cutoff is wrong type")

        elif type(params['visible_ratio_cutoff']) != float:
            raise TypeError("visible_ratio_cutoff is wrong type")

        elif type(params['served_ratio_cutoff']) != float:
            raise TypeError("served_ratio_cutoff is wrong type")

        elif any(x < 0 for x in list(params.values())):
            raise AttributeError("Inputs cannot be negative")


    def transform(self, params):

        self.check_params(params)
        if len(self.df) > 0:

            self.df['imps_served_cutoff'] = params['imps_served_cutoff']
            self.df['imps_loaded_cutoff'] = params['imps_loaded_cutoff']

            self.df['loaded_ratio_cutoff'] = params['loaded_ratio_cutoff']
            self.df['visible_ratio_cutoff'] = params['visible_ratio_cutoff']
            self.df['served_ratio_cutoff'] = params['served_ratio_cutoff']

            self.df['visible_ratio'] = self.df['visible'] / self.df['loaded'].astype(float)
            self.df['loaded_ratio'] = self.df['loaded'] / self.df['imps_served_rbox'].astype(float)
            self.df['served_ratio'] = self.df['imps_served_rbox'] / self.df['imps_served_apnx'].astype(float)
            self.df = self.df.fillna(0)        


    def filter(self):

        if len(self.df) > 0:
            
            # Filtering out bad urls
            url_patterns = [".fr", ".be", ".ca", ".co.uk", ".com", ".co"]
            self.df = self.df[ list(pd.Series(self.df.index).apply(lambda x: any(url in x for url in url_patterns))) ]

            # Filtering out domains which stopped serving on
            self.df = self.df[self.df['last_served_date'] >= self.end_date]

            # Choosing top 50 domains currently serving on 
            self.df = self.df.sort('imps_served_apnx', ascending = False).head(50)




