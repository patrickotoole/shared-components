import tornado.web
import pandas as pd
import json
import logging
from database import *
from api import *
from datetime import datetime, timedelta
import numpy as np

def build_metrics(df, groups, end_date = datetime.today().strftime("%Y%m%d") ):

    seven_days_ago = (datetime.strptime(end_date, "%Y%m%d")-timedelta(days=7)).strftime("%Y%m%d")
    thirty_days_ago = (datetime.strptime(end_date, "%Y%m%d")-timedelta(days=30)).strftime("%Y%m%d")
    yest = (datetime.strptime(end_date, "%Y%m%d")-timedelta(days=1)).strftime("%Y%m%d")

    thirty_days_data = df[df['date']>=thirty_days_ago].groupby(groups).sum()
    seved_days_data = df[df['date']>=seven_days_ago].groupby(groups).sum()
    yest_data = df[(df['date']>= yest) & (df['date']< end_date) ].groupby(groups).sum()
    today_data = df[df['date']>=end_date].groupby(groups).sum()

    g1 = pd.merge(thirty_days_data, seved_days_data, left_index = True, right_index = True, how = 'outer', suffixes = ["_30d","_7d"])
    g2 = pd.merge(yest_data, today_data, left_index = True, right_index = True, how = 'outer', suffixes = ["_yest","_today"])

    metrics = pd.merge(g1, g2, left_index = True, right_index = True, how = 'outer').fillna(0).reset_index()
    
    metrics['cpa_30d'] = metrics['media_cost_30d']/ metrics['conv_30d']
    metrics['cpa_attr_30d'] = metrics['media_cost_30d']/ metrics['attr_conv_30d']
    metrics['cpc_30d'] = metrics['media_cost_30d']/ metrics['clicks_30d']
    metrics['ctr_30d'] = metrics['clicks_30d']/ metrics['imps_30d']

    metrics['cpa_7d'] = metrics['media_cost_7d']/ metrics['conv_7d']
    metrics['cpa_attr_7d'] = metrics['media_cost_7d']/ metrics['attr_conv_7d']
    metrics['cpc_7d'] = metrics['media_cost_7d']/ metrics['clicks_7d']
    metrics['ctr_7d'] = metrics['clicks_7d']/ metrics['imps_7d']

    metrics['cpa_yest'] = metrics['media_cost_yest']/ metrics['conv_yest']
    metrics['cpa_attr_yest'] = metrics['media_cost_yest']/ metrics['attr_conv_yest']
    metrics['cpc_yest'] = metrics['media_cost_yest']/ metrics['clicks_yest']
    metrics['ctr_yest'] = metrics['clicks_yest']/ metrics['imps_yest']
    
    metrics['cpa_today'] = metrics['media_cost_today']/ metrics['conv_today']
    metrics['cpa_attr_today'] = metrics['media_cost_today']/ metrics['attr_conv_today']
    metrics['cpc_today'] = metrics['media_cost_today']/ metrics['clicks_today']
    metrics['ctr_today'] = metrics['clicks_today']/ metrics['imps_today']

    metrics['cpm'] = metrics['media_cost_yest']*1000./ metrics['imps_yest']

    metrics['num_campaigns_30d'] = metrics['num_campaigns_30d'].astype(int) / 30
    metrics['num_campaigns_7d'] = metrics['num_campaigns_7d'].astype(int) / 7

    metrics = metrics.replace([np.nan, np.inf, -np.inf], np.nan)

    return metrics

    

def fill_missing_dates(df, start_date, end_date):
    df = df.set_index('date').reindex(pd.date_range(start_date, end_date), fill_value=0)
    df.index.name = 'date'
    df = df.reset_index()
    return df


class LineItemHandler(tornado.web.RequestHandler, LineItemsDatabase, LineItemsAPI):

    def initialize(self,**kwargs):
        self.db = kwargs.get("reporting",False) 
        self.api = kwargs.get("api",False)

    def reshape_optimizations(self, df, start_date, end_date):

        pivoted = df.pivot_table(index = ['date'], columns = 'optimization',values = 'num_opts').fillna(0).reset_index()
        pivoted = fill_missing_dates(pivoted, start_date, end_date)
        pivoted['line_item_id'] = df['line_item_id'].iloc[0]
        grouped = pivoted.groupby(['line_item_id','date']).apply(lambda x: pd.Series({'optimizations':x.drop(['date','line_item_id'],axis=1).to_dict('records')[0]}))
        return grouped.reset_index()

    def get_optimizations(self, advertiser_id, start_date, end_date):

        opts = self.get_opts_from_db(advertiser_id, start_date, end_date)
        opts_grouped = opts.groupby('line_item_id').apply(lambda x: self.reshape_optimizations(x, start_date, end_date))
        return opts_grouped

    def reshape_reporting(self, df, start_date, end_date):

        expanded  = fill_missing_dates(df, start_date, end_date)
        expanded['line_item_id'] = df['line_item_id'].iloc[0]
        expanded['line_item_name'] = df['line_item_name'].iloc[0]
        expanded['funnel'] = df['funnel'].iloc[0]

        return expanded

    def get_reporting(self, advertiser_id, start_date, end_date):

        data = self.get_data(advertiser_id, start_date, end_date)
        # data['funnel'] = data['line_item_name'].apply(lambda x: x.split(" | ")[0])        
        data = data.groupby('line_item_id').apply(lambda x: self.reshape_reporting(x, start_date, end_date))
        return data

    def extract(self, advertiser_id, start_date, end_date, active):

        reporting = self.get_reporting(advertiser_id, start_date, end_date)
        optimizations = self.get_optimizations(advertiser_id, start_date, end_date)
        data = pd.merge(reporting, optimizations, on = ['date','line_item_id'], how = 'left')
        if active  == True:
            console_lines = self.get_from_appnexus(advertiser_id)
            console_lines['id'] = console_lines['id'].astype(str)
            data = pd.merge(data, console_lines[console_lines['state']=="active"][['id']], left_on = 'line_item_id', right_on = 'id', how = 'inner')
        return data

    def transform(self, df, timeseries):

        dd = build_metrics(df, ['funnel','line_item_name'])
        if timeseries:
            df['date'] = df['date'].apply(lambda x: x.strftime("%Y-%m-%d %H:%M:%S"))
            dd['data'] = json.dumps(df.drop(['funnel','line_item_name','line_item_id'], axis = 1).fillna(0).to_dict('records'))
            dd['line_item_ids'] = json.dumps(df['line_item_id'].tolist())
        return dd

    def get(self):

        advertiser_id = self.get_query_argument("advertiser")
        start_date = str(self.get_query_argument("start_date", "20170101"))
        end_date = str(self.get_query_argument("end_date", datetime.today().strftime("%Y%m%d")))
        timeseries = self.get_query_argument("timeseries", False)
        active = self.get_query_argument("active", True)

        data = self.extract(advertiser_id, start_date, end_date, active)
        transformed = data.groupby(['funnel','line_item_name']).apply(lambda x: self.transform(x, timeseries) )
        transformed = transformed.fillna(0)

        self.write(json.dumps(transformed.to_dict('records')))

