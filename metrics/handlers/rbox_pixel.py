import tornado.web
import pandas as pd
import StringIO
import json

from twisted.internet import defer

from base import BaseHandler
from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred

MYSQL_QUERY="select advertiser_name, pixel_source_name, external_advertiser_id, deleted, active, min_report_date from advertiser where not pixel_source_name = 'None'"

HIVE_QUERY='select date, hour, sum(num_imps) as imps, sum(num_conv) as conv, sum(num_rbox_imps) as rbox_imp, sum(num_rbox_conv) as rbox_conv from agg_pixel where source = "{}" and date >= "14-07-01" group by date, hour'

class PixelBaseHandler(BaseHandler):
    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

class RockerboxPixelHandler(PixelBaseHandler):
    def get(self):
        pixel_source_names = self.db.select_dataframe(MYSQL_QUERY)
        self.render("analysis/_pixel.html", data=pixel_source_names.to_html())
    
class PixelAdvertiserHandler(PixelBaseHandler):
    @decorators.formattable
    def get_content(self, data):
        if not self.get_argument("format", False):
            data = data.to_html(index=False)

        def default(self, data):
            self.render("analysis/_pixel.html", data=data)

        yield default, (data,)

    @defer.inlineCallbacks
    def get_data(self, query):
        result = yield run_hive_session_deferred(self.hive, ["set shark.map.tasks=32", "set mapred.reduce.tasks=3",query])
        df = pd.DataFrame(result)
        self.get_content(df)

    @tornado.web.asynchronous
    def get(self, pixel_source_name):
        query = HIVE_QUERY.format(pixel_source_name)
        self.get_data(query)
        
