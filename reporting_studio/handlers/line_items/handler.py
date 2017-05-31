import tornado.web
from link import lnk
import pandas as pd
import json
import logging
from database import *
import numpy as np
from database import *
from datetime import datetime, timedelta
import sys
sys.path.append("../")
from helpers import *

class LineItemHandler(tornado.web.RequestHandler, LineItemsDatabase):

    def initialize(self,**kwargs):
        self.db = kwargs.get("reporting",False) 

    def get(self):

        advertiser_id = self.get_query_argument("advertiser")
        start_date = str(self.get_query_argument("start_date", "20170101"))
        end_date = str(self.get_query_argument("end_date", datetime.today().strftime("%Y%m%d")))

        data = self.get_data(advertiser_id, start_date, end_date)

        metrics = build_metrics(data, "line_item_name")
        metrics = metrics[metrics['imps_yest']>0]

        metrics['seed'] = metrics['line_item_name'].apply(lambda x: x.split(" | ")[0])

        data['date'] = data['date'].apply(lambda x: x.strftime("%Y-%m-%d %H:%M:%S"))
        data['cpc'] = data['media_cost'] /data['clicks'].astype(float)
        data['ctr'] = data['clicks'] /data['imps'].astype(float)
        data['cpa_attr'] = data['media_cost'] /data['attr_conv'].astype(float)

        data = data.replace([np.nan, np.inf, -np.inf], np.nan)
        
        self.render("line_item.html", 
                    metrics = json.dumps(metrics.to_dict('records')), 
                    data = json.dumps(data.to_dict('records')) )
