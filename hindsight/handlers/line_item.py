import tornado.web
import ujson
import pandas
import mock
import time
import logging

from base import BaseHandler
from twisted.internet import defer
from lib.helpers import *

SELECT = "select * from advertiser_line_item where deleted = 0 and external_advertiser_id = '%s'"

class LineItemHandler(BaseHandler):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache = crushercache

    def get(self):
        advertiser_id = self.current_advertiser
        data = self.db.select_dataframe(SELECT % advertiser_id)
        self.write( ujson.dumps({"response":data.to_dict('records')}) )

