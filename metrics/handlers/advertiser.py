import tornado.web
import ujson
import pandas
import StringIO
import mock
import time
from base import BaseHandler

from lib.helpers import *  

API_QUERY = "select * from advertiser where %s "

INCLUDES = {
    "pixels":"advertiser_pixel",
    "campaigns": "advertiser_campaign",
    "segments": "advertiser_segment",
    "domain_lists": "advertiser_domain_list",
    "insertion_orders": "insertion_order"
}

class AdvertiserHandler(BaseHandler):

    def initialize(self, db, api):
        self.db = db 
        self.api = api

    @decorators.formattable
    def get_content(self,data,advertiser_id):
        
        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("../templates/advertiser.html",data=o) 

        yield default, (data,)

    def get_data(self,advertiser_id=False):

        where = "deleted = 0"
        if advertiser_id:
            where = ("external_advertiser_id = %s" % advertiser_id)
        
        df = self.db.select_dataframe(API_QUERY % where).set_index("external_advertiser_id")
        includes = self.get_argument("include","segments")

        include_list = includes.split(",")
        for include in include_list:
            included = INCLUDES.get(include,False)
            if included:
              q = "select * from %s where %s" % (included,where)
              idf = self.db.select_dataframe(q)
              if len(idf) > 0:
                  df[include] = idf.groupby("external_advertiser_id").apply(Convert.df_to_values)

        self.get_content(df.reset_index(),advertiser_id)
        

    @tornado.web.asynchronous
    def get(self):
        advertiser_id = self.current_advertiser
        if advertiser_id:
            self.get_data(advertiser_id)
        else:
            self.redirect("/")