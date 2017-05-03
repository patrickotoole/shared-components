import tornado.web
from link import lnk
import pandas as pd
import json
import logging
from database import *
import numpy as np

def build_tree(df, groups):
    
    group = groups[0]
    groups = groups[1:]
    tree = []
    if group == "campaign_name" or len(groups) == 0:
        for name, gg in df.groupby(group):

            metrics = calculate_campaign_metrics(gg.sum(numeric_only = True))
            tree.append({"name":name, 
                         "level": group,
                         "metrics": metrics.to_dict()   })
        
    else:
        for name, gg in df.groupby(group):
            
            metrics = calculate_campaign_metrics(gg.sum(numeric_only = True))
            tree.append({"name":name, 
                         "metrics": metrics.to_dict(), 
                         "level": group,
                         "num_children": len(group),
                         "children": build_tree(gg, groups)})

    return tree

def calculate_campaign_metrics(df):

    df['cpa_7d'] = df['media_cost_7d'] / df['conv_7d']
    df['cpa_yest'] = df['media_cost_yest'] / df['conv_yest']
    df = df.fillna(0)
    df = df.replace([np.nan, np.inf, -np.inf],0)

    return df


def get_campaign_type(campaign_name):
    
    if "Yoshi" in campaign_name:
        return "Yoshi"
    
    elif "Delorean" in campaign_name:
        if "Attribution" in campaign_name:
            return "Delorean Attribution"
        else:
            return "Delorean"
    
    elif "Retarg" in campaign_name:
        return "Retargeting"
    
    elif "Google" in campaign_name:
        return "Google"
    
    else:
        return "Misc"


class IndexHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("reporting",False) 
        pass

    def get(self):

        self.render("index.html")

LEVELS = 'conv_type,campaign_type,line_item_name,campaign_name'

from datetime import datetime, timedelta


class MetricsHandler(tornado.web.RequestHandler, DataBase):

    def initialize(self,**kwargs):
        self.db = kwargs.get("reporting",False) 
        pass


    def get(self):

        advertiser_id = self.get_query_argument("advertiser")
        start_date = self.get_query_argument("start_date", "20170101")
        end_date = self.get_query_argument("end_date", datetime.today().strftime("%Y%m%d"))
        levels = self.get_query_argument("levels", LEVELS).split(",")

        data = self.get_data(advertiser_id, start_date, end_date)

        conv_campaigns = set(data[data['conv']>0]['campaign_name'].unique())
        data['conv_type'] = data['campaign_name'].apply(lambda x: "Conv" if x in conv_campaigns else "No Conv")
        data['campaign_type'] = data['campaign_name'].apply(get_campaign_type)
        

        seven_days_ago = (datetime.strptime(end_date, "%Y%m%d")-timedelta(days=7)).strftime("%Y%m%d")
        thirty_days_ago = (datetime.strptime(end_date, "%Y%m%d")-timedelta(days=30)).strftime("%Y%m%d")
        yest = (datetime.strptime(end_date, "%Y%m%d")-timedelta(days=1)).strftime("%Y%m%d")


        metrics = pd.merge( data[data['date']>=seven_days_ago].groupby(levels).sum(),
                            data[(data['date']>=yest)&(data['date']<end_date)].groupby(levels).sum(),
                            left_index = True, right_index = True, how = 'outer', suffixes = ["_7d","_yest"]).fillna(0).reset_index()

        tree = build_tree(metrics, levels)

        data['date'] = data['date'].apply(lambda x: x.strftime("%Y-%m-%d %H:%M:%S"))

        self.render("metrics.html", data = json.dumps(data.to_dict('records')), 
            tree = json.dumps({"name":advertiser_id, "children":tree, "metrics" : calculate_campaign_metrics(metrics.sum(numeric_only = True)).to_dict() }))





        