import tornado.web
import ujson
import pandas as pd
import StringIO
import json
import os
import time
import vincent
from base import BaseHandler
from lib.helpers import *

class PixelBaseHandler(BaseHandler):
    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

class RockerboxPixelHandler(PixelBaseHandler):
    def get(self):
        pixel_source_names = self.db.select_dataframe("select advertiser_name, pixel_source_name, external_advertiser_id, deleted, active, min_report_date from advertiser where not pixel_source_name = 'None'")
        self.render("analysis/_pixel.html", data=pixel_source_names.to_html())
    
class PixelAdvertiserHandler(PixelBaseHandler):
    def get(self, pixel_source_name):
        data = pd.DataFrame(self.pull_advertiser(pixel_source_name)).to_html()
        self.render("analysis/_pixel.html", data=data)

    def pull_advertiser(self, pixel_source_name):
        query = 'select date, hour, sum(num_imps) as imps, sum(num_conv) as conv, sum(num_rbox_imps) as rbox_imp, sum(num_rbox_conv) as rbox_conv from agg_pixel where source = "{}" and date >= "14-07-01" group by date, hour'.format(pixel_source_name)
        print query
        data = self.hive.session_execute(["set shark.map.tasks=32", "set mapred.reduce.tasks=3",query])
        return data
