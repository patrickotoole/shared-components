import pandas as pd
import numpy as np
import datetime
import re
from opt_script import Action

@Analysis.verify_cols(['placement_id','day','imps','clicks','total_convs','post_view_convs','post_click_convs','media_cost', 'total_revenue'])
def placement_by_day_df(ID, df):
    '''
    Creates dataframe for individual placement
    '''
    placement_data = df[df['placement_id'] == ID]

    placement_data = placement_data.groupby('day').sum()[['imps','clicks','total_convs','post_view_convs','post_click_convs','media_cost', 'total_revenue']]
    placement_data = placement_data.sort()
    placement_data['CTR'] = placement_data['clicks'] / placement_data['imps'].astype(float)
    placement_data['CPM'] = 1000 * placement_data['media_cost'] / placement_data['imps'].astype(float)
    placement_data = placement_data.replace([np.inf, -np.inf], 0)
    placement_data = placement_data.fillna(0)
    return placement_data

def placement_reshape(df):
    summary = []
    for ID in df['placement_id'].unique():
        #print ID
        d = {}

        seller_placement_df = placement_by_day_df(ID, df)
        M = len(seller_placement_df)

        d['placement_id'] = ID
        d['num_days'] = M
        d['last_served_date'] = seller_placement_df.index.max()

        # Media Cost
        d['media_cost'] = seller_placement_df['media_cost'].sum()
        d['avg_media_cost'] = d['media_cost'] / d['num_days']
        d['current_daily_media_cost'] = seller_placement_df['media_cost'].iloc[M - 1]
        d['revenue'] = seller_placement_df['total_revenue'].sum()
        d['profit'] = d['revenue'] - d['media_cost']

        # Imps Served
        d['imps_served'] = seller_placement_df['imps'].sum()
        d['imps_served_avg'] = seller_placement_df['imps'].mean()
        d['imps_served_stdev'] = seller_placement_df['imps'].std()
        d['current_imps_served'] = seller_placement_df.iloc[M -1 ]['imps']
        if d['num_days'] > 8:
            d['7_day_imps_served_avg'] = seller_placement_df.iloc[M -8 : M -2 ]['imps'].mean()
            d['7_day_imps_served'] = seller_placement_df.iloc[M - 8 : M -1 ]['imps'].sum()
        else:
            d['7_day_imps_served_avg'] = 0
            d['7_day_imps_served'] = 0

        # Convs
        d['convs'] = seller_placement_df['total_convs'].sum()
        d['post_view_convs'] = seller_placement_df['post_view_convs'].sum()
        d['post_click_convs'] = seller_placement_df['post_click_convs'].sum()

        # CPM/RM 
        d['CPM'] = 1000 * seller_placement_df['media_cost'].sum() / float(seller_placement_df['imps'].sum())
        d['RPM'] = 1000 * seller_placement_df['total_revenue'].sum() / float(seller_placement_df['imps'].sum())

        # clicks
        d['clicks'] = seller_placement_df['clicks'].sum()
        d['clicks_avg'] = seller_placement_df['clicks'].mean()
        d['current_daily_CTR'] = seller_placement_df.iloc[M -1 ]['CTR']
        d['CTR'] = d['clicks'] / float(d['imps_served'])
        #print d['CTR']
        d['CTR_avg'] = seller_placement_df['CTR'].mean()
        d['CTR_stdev'] = seller_placement_df['CTR'].std()

        if d['num_days'] > 8:
            d['7_day_clicks'] = seller_placement_df.iloc[ M -8 : M -1 ]['clicks'].sum()
            d['7_day_CTR_avg'] = seller_placement_df.iloc[M -8 : M -2 ]['CTR'].mean()
            d['7_day_CTR_total'] = seller_placement_df.iloc[M -8 : M -2 ]['clicks'].sum() / float(seller_placement_df.iloc[M - 8 : M -1 ]['imps'].sum())
        else:
            d['7_day_clicks'] = 0
            d['7_day_CTR_avg'] = 0
            d['7_day_CTR_total'] = 0

        summary.append(d)

    summary = pd.DataFrame(summary)
    summary = summary.replace([np.inf, -np.inf], 0)
    summary = summary.fillna(0)

    summary['media_cost'] = summary['media_cost'].apply(lambda x: round(x, 2))
    summary['avg_media_cost'] = summary['avg_media_cost'].apply(lambda x: round(x, 2))
    summary['current_daily_media_cost'] = summary['current_daily_media_cost'].apply(lambda x: round(x, 2))
    summary['revenue'] = summary['revenue'].apply(lambda x: round(x, 2))
    summary['profit'] = summary['profit'].apply(lambda x: round(x, 2))
    summary = summary.set_index('placement_id')
    return summary


class seller_filters():

    def __init__(self, campaign_id, summary, start_date, end_date):

        self.campaign_id = campaign_id
        self.summary = summary
        self.start_date = start_date
        self.end_date = end_date

        self.cutoffs = {}
        self.RPA = None
        self.still_serving = None
        self.data_filtered = False

    def get_still_serving(self):
        '''
        Sellers where last served date >= end_date - 1 day (due to Appnexus)
        '''
        self.still_serving = self.summary[ self.summary['last_served_date'] >= self.end_date ]
        

    def run(self, since_last_served_cutoff, num_days_served_cutoff, imps_cutoff, RPA):
        
        self.RPA = RPA
        
        self.cutoffs['last_served_date'] = (datetime.datetime.strptime(self.end_date, "%Y-%m-%d") - 
            datetime.timedelta(days = since_last_served_cutoff)).strftime('%Y-%m-%d')

        self.cutoffs['num_days_served'] = num_days_served_cutoff
        self.cutoffs['imps'] = imps_cutoff

        self.get_still_serving()
        self.data_filtered = True








