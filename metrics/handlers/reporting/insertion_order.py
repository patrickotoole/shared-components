import tornado.web
import pandas
import numpy as np
from lib.helpers import *
from lib.intraweek.intraweek_update import *
from ..base import BaseHandler

pandas.options.display.max_colwidth = 1000

class InsertionOrderHandler(BaseHandler):
    
    def initialize(self, api=None, redis=None,db=None):
        self.redis = redis
        self.db = db
        self.iw = Intraweek(self.db)

    def get_data(self):
        advertiser = self.get_current_advertiser()
        df = self.iw.get_advertiser_info(int(advertiser))

        return df.replace([np.inf, -np.inf], np.nan)
 
    @decorators.formattable
    def get(self,*args,**kwargs):
        data = self.get_data()
        yield renderers['json'], (data,)
 
