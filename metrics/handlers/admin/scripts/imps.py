import tornado.web
import ujson
import pandas as pd
import StringIO
import json

from lib.helpers import *
from lib.query.MYSQL import *

class ImpsHandler(tornado.web.RequestHandler):
    def initialize(self, db, api, hive):
        self.db = db
        self.api = api
        self.hive = hive

    def pull_segments_list(self):
        '''Returns a DataFrame representing all segments along with their advertiser_id and name'''
        segments = self.db.select_dataframe(SEGMENTS_LIST)
        return segments

    @decorators.formattable
    def get(self):
        data = self.pull_segments_list()
        self.render("admin/_imps.html", stuff=data.to_html(index=False))
