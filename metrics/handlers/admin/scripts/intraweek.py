import tornado.web
import ujson
import pandas
import numpy as np
from lib.helpers import *
from tornado.httpclient import AsyncHTTPClient
from tornado.httpclient import HTTPClient
from lib.intraweek.intraweek_update import *
from link import lnk

pandas.options.display.max_colwidth = 1000

def default_renderer(self,data,*args):
    profile_df = data.copy()

    # format the dataframe here
    formatted = profile_df.to_html() 

    # create a new template 
    self.render(
        "../templates/admin/_intraweek.html", 
        df_html=formatted,
        profile=Convert.df_to_json(data)
    )


class IntraWeekHandler(tornado.web.RequestHandler):
    
    def initialize(self, api=None, redis=None,db=None):
        self.redis = redis
        self.db = db
        self.iw = Intraweek(self.db)

    def get_data(self):
        advertiser = self.get_argument("advertiser",False)
        rows=self.get_argument("rows",False)
        ioinfo = self.get_argument("ioinfo", False)
        
        if rows: # try the get the int number of advertisers
          try:
            rows = int(rows)
          except ValueError:
            rows = 4
        else:
          rows = 4

        # execute the logic for which df to display
        if advertiser: # try to get the table for that advertiser
            try:
              return self.iw.get_advertiser_table(int(advertiser), rows).replace([np.inf, -np.inf], np.nan)
            except ValueError:
              return self.iw.get_compiled_pacing_reports().replace([np.inf, -np.inf], np.nan)
        elif ioinfo:
            try:
              return self.iw.get_advertiser_info(int(ioinfo)).replace([np.inf, -np.inf], np.nan)
            except ValueError:
              return self.iw.get_compiled_pacing_reports().replace([np.inf, -np.inf], np.nan)
        else:
            return self.iw.get_compiled_pacing_reports().replace([np.inf, -np.inf], np.nan)
 
        # blank dataframe, should not reach this point! 
        return pandas.DataFrame([1]) #df
 
    @decorators.formattable
    def get(self,*args,**kwargs):
        data = self.get_data()
        yield default_renderer, (data,)

