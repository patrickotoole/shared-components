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

class RockerboxPixelHandler(BaseHandler):
    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

    def get(self):
        pixel_source_names = self.db.select_dataframe("select pixel_source_name from advertiser")
        self.write(pixel_source_names.to_html())
