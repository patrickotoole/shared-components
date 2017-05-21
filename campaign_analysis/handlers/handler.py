import tornado.web
from link import lnk
import pandas as pd
import json
import logging
from database import *
import numpy as np
from database import *


def build_tree(df, levels, max_level):

    level = levels[0]
    levels = levels[1:]
    tree = []

    if level == max_level or len(levels) == 0:
        for name, dd in df.groupby(level):

            tree.append({
                'name': name,
                'level': level,
                'metrics': dd.sum(numeric_only = True).to_dict(),
                'campaigns': dd['campaign_id'].tolist()
            })
    else:
        for name, dd in df.groupby(level):

            tree.append({
                'name': name,
                'level': level,
                'metrics': dd[pd.isnull(dd[levels[0]])].sum(numeric_only = True).to_dict(),
                'children': build_tree(dd, levels, max_level),
                'campaigns': dd['campaign_id'].tolist()
            })
    return tree


class CampaignHandler(tornado.web.RequestHandler, DataBase):

    def initialize(self,**kwargs):
        self.db = kwargs.get("reporting",False) 

    def get(self):
        from datetime import datetime

        advertiser_id = self.get_query_argument("advertiser")
        start_date = str(self.get_query_argument("start_date", "20170101"))
        end_date = str(self.get_query_argument("end_date", datetime.today().strftime("%Y%m%d")))
        campaign_id = self.get_query_argument("campaign_id")

        data = self.get_data(advertiser_id, campaign_id, start_date, end_date)

        campaign_metrics = data.groupby(['line_item_name','campaign_name','campaign_id']).sum().reset_index()
        campaign_metrics['cpa'] = campaign_metrics['media_cost'] / campaign_metrics['conv']
        campaign_metrics = campaign_metrics.fillna(0)
        campaign_metrics = campaign_metrics.replace([np.nan, np.inf, -np.inf],0)


        max_levels = campaign_metrics['campaign_name'].apply(lambda x: len(x.split(" - include "))).max()

        for k in range(max_levels):
            campaign_metrics['level%s'%str(k)] = campaign_metrics['campaign_name'].apply(lambda x:  x.split(" - include ")[k] if len(x.split(" - include "))>k else None   )

        levels = ["level%s"%str(i) for i in range(max_levels) ] 

        tree = build_tree(df =campaign_metrics, levels = levels, max_level = levels[-1])

        self.render("campaignOptTree.html", tree = json.dumps(tree[0]) )

