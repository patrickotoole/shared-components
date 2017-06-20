import tornado.web
from link import lnk
import pandas as pd
import json
import logging
from database import *
import numpy as np
from database import *
from datetime import datetime, timedelta

def clean_name(name):
    name = name.replace("Yoshi |","")
    name = name.replace("Delorean |","")
    return name.replace("platform_placement_targets: ","").replace("domain: ","").replace("size :","").replace("dma :","")

def build_tree(df, levels, max_level):

    level = levels[0]
    levels = levels[1:]
    tree = []

    if level == max_level or len(levels) == 0:
        for name, dd in df.groupby(level):
            if name is not None:
                tree.append({
                    'name': clean_name(name),
                    'level': level,
                    'metrics': calculate_metrics(dd.sum(numeric_only = True)).to_dict(),
                    'campaign_metrics': calculate_metrics(dd.sum(numeric_only = True)).to_dict(),
                    'campaigns': dd['campaign_id'].tolist(),
                    'level_campaigns': dd['campaign_id'].tolist()
                })
    else:
        for name, dd in df.groupby(level):
            if name is not None:

                tree.append({
                    'name': clean_name(name),
                    'level': level,
                    'metrics': calculate_metrics(dd.sum(numeric_only = True)).to_dict(),
                    'campaign_metrics': dd[pd.isnull(dd[levels[0]])].sum(numeric_only = True).to_dict(),
                    'children': build_tree(dd, levels, max_level),
                    'campaigns': dd['campaign_id'].tolist(),
                    'level_campaigns': dd[pd.isnull(dd[levels[0]])]['campaign_id'].tolist()
                })
    return tree

def calculate_metrics(metrics):
    metrics['cpc_total'] = metrics['media_cost_total']/ metrics['clicks_total']
    metrics['ctr_total'] = metrics['clicks_total']/ metrics['imps_total']

    metrics['cpc_30d'] = metrics['media_cost_30d']/ metrics['clicks_30d']
    metrics['ctr_30d'] = metrics['clicks_30d']/ metrics['imps_30d']

    metrics['cpc_7d'] = metrics['media_cost_7d']/ metrics['clicks_7d']
    metrics['ctr_7d'] = metrics['clicks_7d']/ metrics['imps_7d']

    metrics['cpc_yest'] = metrics['media_cost_yest']/ metrics['clicks_yest']
    metrics['ctr_yest'] = metrics['clicks_yest']/ metrics['imps_yest']
    
    metrics['cpa_total'] = metrics['media_cost_total']/ metrics['conv_total']
    metrics['cpa_30d'] = metrics['media_cost_30d']/ metrics['conv_30d']
    metrics['cpa_7d'] = metrics['media_cost_7d']/ metrics['conv_7d']
    metrics['cpa_yest'] = metrics['media_cost_yest']/ metrics['conv_yest']

    metrics['cpa_attr_total'] = metrics['media_cost_total']/ metrics['attr_conv_total']
    metrics['cpa_attr_30d'] = metrics['media_cost_30d']/ metrics['attr_conv_30d']
    metrics['cpa_attr_7d'] = metrics['media_cost_7d']/ metrics['attr_conv_7d']
    metrics['cpa_attr_yest'] = metrics['media_cost_yest']/ metrics['attr_conv_yest']

    metrics['roas_total'] =  (metrics['attr_conv_total'] * 475. * .2*.35 )/ metrics['media_spend_total'] 
    metrics['roas_30d'] =  (metrics['attr_conv_30d'] * 475. * .2*.35 )/ metrics['media_spend_30d'] 
    metrics['roas_7d'] =  (metrics['attr_conv_7d'] * 475. * .2*.35 )/ metrics['media_spend_7d'] 
    metrics['roas_yest'] =  (metrics['attr_conv_yest'] * 475. * .2*.35 )/ metrics['media_spend_yest'] 

    metrics['cpm'] = metrics['media_cost_yest']*1000./ metrics['imps_yest']

    metrics = metrics.replace([np.nan, np.inf, -np.inf], np.nan)

    return metrics

def build_metrics(df, groups, end_date = datetime.today().strftime("%Y%m%d")):

    seven_days_ago = (datetime.strptime(end_date, "%Y%m%d")-timedelta(days=7)).strftime("%Y%m%d")
    thirty_days_ago = (datetime.strptime(end_date, "%Y%m%d")-timedelta(days=30)).strftime("%Y%m%d")
    yest = (datetime.strptime(end_date, "%Y%m%d")-timedelta(days=1)).strftime("%Y%m%d")

    thirty_days_data = df[df['date']>=thirty_days_ago].groupby(groups).sum()
    seved_days_data = df[df['date']>=seven_days_ago].groupby(groups).sum()
    yest_data = df[(df['date']>= yest) & (df['date']< end_date) ].groupby(groups).sum()
    today_data = df[df['date']>=end_date].groupby(groups).sum()
    total_data = df.groupby(groups).sum()


    g1 = pd.merge(thirty_days_data, seved_days_data, left_index = True, right_index = True, how = 'outer', suffixes = ["_30d","_7d"])
    g2 = pd.merge(yest_data, total_data, left_index = True, right_index = True, how = 'outer', suffixes = ["_yest","_total"])

    metrics = pd.merge(g1, g2, left_index = True, right_index = True, how = 'outer').fillna(0).reset_index()
    metrics = calculate_metrics(metrics)

    return metrics


class OptFunnelHandler(tornado.web.RequestHandler, CampaignsDatabase):
    
    def initialize(self,**kwargs):
        self.db = kwargs.get("reporting",False) 

    def create_optimization_tree(self, campaign_metrics, advertiser_id):
        campaign_metrics['opt_level'] = str(advertiser_id) + " - include " + campaign_metrics['funnel'].astype(str)+ " - include " + campaign_metrics['campaign_name']

        max_levels = campaign_metrics['opt_level'].apply(lambda x: len(x.split(" - include "))).max()
        for k in range(max_levels):
            campaign_metrics['level%s'%str(k)] = campaign_metrics['opt_level'].apply(lambda x:  x.split(" - include ")[k] if len(x.split(" - include "))>k else None   )

        levels = ["level%s"%str(i) for i in range(max_levels) ] 

        tree = build_tree(df =campaign_metrics, levels = levels, max_level = levels[-1])
        return tree

    def get(self):

        advertiser_id = self.get_query_argument("advertiser")
        start_date = str(self.get_query_argument("start_date", "20170101"))
        end_date = str(self.get_query_argument("end_date", datetime.today().strftime("%Y%m%d")))
        line_item_id = self.get_query_argument("line_item_id", False)
        if line_item_id:
            line_item_campaigns = self.campaigns_from_line_items(advertiser_id,line_item_id)        
            campaign_list = self.get_campaigns_and_children(advertiser_id, line_item_campaigns['campaign_id'].tolist())
            data = self.get_data_from_campaign_list(advertiser_id, start_date, end_date, ",".join(campaign_list))
        else:
            data = self.get_data(advertiser_id, start_date, end_date)

        campaign_metrics = build_metrics(data, ['funnel','line_item_name','campaign_name','campaign_id'], end_date)
        # campaign_metrics['seed_line_item'] = campaign_metrics['line_item_name'].apply(lambda x: x.split(" | ")[0])
        tree = self.create_optimization_tree(campaign_metrics, advertiser_id)
        
        self.render("campaign_funnel.html", 
            tree = json.dumps(tree[0]) , 
            campaign_metrics = json.dumps(campaign_metrics.to_dict('records')))




class CampaignTreeHandler(tornado.web.RequestHandler, CampaignsDatabase):

    def initialize(self,**kwargs):
        self.db = kwargs.get("reporting",False) 

    def create_optimization_tree(self, campaign_metrics):
        campaign_metrics['opt_level'] = campaign_metrics['seed_line_item']+ " - include " + campaign_metrics['campaign_name']

        max_levels = campaign_metrics['opt_level'].apply(lambda x: len(x.split(" - include "))).max()
        for k in range(max_levels):
            campaign_metrics['level%s'%str(k)] = campaign_metrics['opt_level'].apply(lambda x:  x.split(" - include ")[k] if len(x.split(" - include "))>k else None   )

        levels = ["level%s"%str(i) for i in range(max_levels) ] 

        tree = build_tree(df =campaign_metrics, levels = levels, max_level = levels[-1])
        return tree


    def get(self):

        advertiser_id = self.get_query_argument("advertiser")
        start_date = str(self.get_query_argument("start_date", "20170101"))
        end_date = str(self.get_query_argument("end_date", datetime.today().strftime("%Y%m%d")))
        line_item_id = self.get_query_argument("line_item_id", False)
        active = self.get_query_argument("active", False)

        line_item_campaigns = self.campaigns_from_line_items(advertiser_id,line_item_id)        
        campaign_list = self.get_campaigns_and_children(advertiser_id, line_item_campaigns['campaign_id'].tolist())

        data = self.get_data_from_campaign_list(advertiser_id, start_date, end_date, ",".join(campaign_list))
        campaign_metrics = build_metrics(data, ['line_item_name','campaign_name','campaign_id'], end_date)
        line_item_metrics = build_metrics(data, ['line_item_name'], end_date)

        campaign_metrics['seed_line_item'] = line_item_campaigns['line_item_name'].iloc[0]

        # campaign_metrics = campaign_metrics[campaign_metrics['imps_30d']>0]

        campaign_params = self.get_campaign_params(advertiser_id)
        campaign_params['bid'] = campaign_params['bid_type'] + " $" + campaign_params["bid"].astype(str)
        campaign_params['budget'] = campaign_params['budget_type'] +" "+ campaign_params["budget"].apply(lambda x: "{:,.0f}".format(x)).astype(str)
        campaign_metrics = pd.merge(campaign_metrics, campaign_params[['campaign_id','bid','bid_type','budget','budget_type', "state", "active"]], on ='campaign_id', how = 'left')

        if active:
            campaign_metrics = campaign_metrics[campaign_metrics['active']==str(active)]

        tree = self.create_optimization_tree(campaign_metrics)

        data['date'] = data['date'].apply(lambda x: x.strftime("%Y-%m-%d %H:%M:%S"))
        
        self.render("campaignOptTreeRadial.html", 
                    tree = json.dumps(tree[0]) , 
                    campaign_metrics = json.dumps(campaign_metrics.to_dict('records')), 
                    line_item_metrics = json.dumps(line_item_metrics.to_dict('records')),
                    campaign_data = json.dumps(data.to_dict('records')))



