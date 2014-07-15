import tornado.web
import ujson
import pandas
from lib.helpers import *
from tornado.httpclient import AsyncHTTPClient
from tornado.httpclient import HTTPClient
from lib.intraweek.intraweek_update import *

pandas.options.display.max_colwidth = 1000

def default_renderer(self,data,*args):
    profile_df = data.copy()

    # format the dataframe here
    formatted = profile_df.to_html() 

    # create a new template 
    self.render(
        "../templates/_intraweek.html", 
        df_html=formatted,
        profile=Convert.df_to_json(data)
    )


class IntraWeekHandler(tornado.web.RequestHandler):
    
    def initialize(self, api=None, redis=None,db=None):
        self.redis = redis
        self.db = db

    def get_data(self):
        advertiser = self.get_argument("advertiser",False)

        # execute the logic for which df to display
        if advertiser: # try to get the table for that advertiser
            try:
              return get_advertiser_table(int(advertiser))
            except ValueError:
              return get_compiled_pacing_reports()
        else:
            return get_compiled_pacing_reports()
 
        # blank dataframe, should not reach this point! 
        return pandas.DataFrame([1]) #df
 
    @decorators.formattable
    def get(self,*args,**kwargs):
        data = self.get_data()
        yield default_renderer, (data,)

