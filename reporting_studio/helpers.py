from datetime import datetime, timedelta
import pandas as pd
import numpy as np

def build_metrics(df, groups, end_date = datetime.today().strftime("%Y%m%d")):

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
    metrics['ctr_7'] = metrics['clicks_7d']/ metrics['imps_7d']

    metrics['cpa_yest'] = metrics['media_cost_yest']/ metrics['conv_yest']
    metrics['cpa_attr_yest'] = metrics['media_cost_yest']/ metrics['attr_conv_yest']
    metrics['cpc_yest'] = metrics['media_cost_yest']/ metrics['clicks_yest']
    metrics['ctr_yest'] = metrics['clicks_yest']/ metrics['imps_yest']
    
    metrics['cpa_today'] = metrics['media_cost_today']/ metrics['conv_today']
    metrics['cpa_attr_today'] = metrics['media_cost_today']/ metrics['attr_conv_today']
    metrics['cpc_today'] = metrics['media_cost_today']/ metrics['clicks_today']
    metrics['ctr_today'] = metrics['clicks_today']/ metrics['imps_today']

    metrics['cpm'] = metrics['media_cost_yest']*1000./ metrics['imps_yest']

    # metrics = metrics.fillna(0)
    metrics = metrics.replace([np.nan, np.inf, -np.inf], np.nan)

    return metrics

