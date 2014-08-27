import tornado.web
import pandas as pd
import StringIO
import json

from twisted.internet import defer
from ..base import BaseHandler
from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred

Q = "select pixel_source_name from advertiser where external_advertiser_id = %s"

HIVE_QUERY='select date, hour, sum(num_imps) as imps, sum(num_conv) as conv, sum(num_rbox_imps) as rbox_imp, sum(num_rbox_conv) as rbox_conv from agg_pixel where source = "{}" and date >= "14-07-01" group by date, hour'

class PixelBaseHandler(BaseHandler):
    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

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
        q = [
            "set shark.map.tasks=32", 
            "set mapred.reduce.tasks=3",
            query
        ]
        result = yield run_hive_session_deferred(self.hive, q)
        df = pd.DataFrame(result)
        self.get_content(df)

    

    @tornado.web.asynchronous
    def get(self):
        advertiser_id = self.get_argument(
            "advertiser_id",
            self.current_advertiser
        )
        query = Q % advertiser_id
        pixel_source_name = self.db.select_dataframe(query).values[0][0]

        query = HIVE_QUERY.format(pixel_source_name)
        self.get_data(query)
        
