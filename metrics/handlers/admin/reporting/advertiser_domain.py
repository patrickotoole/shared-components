import tornado.web
import ujson
import pandas

from lib.helpers import *
from lib.query.MYSQL import *
import lib.query.helpers as query_helpers

class AdvertiserReportingHandler(tornado.web.RequestHandler):

    def initialize(self, db=None, **kwargs):
        self.db = db 

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            _json = Convert.df_to_json(data)
            self.write(_json)
            self.finish()
        
        yield default, (data,)


    #@defer.inlineCallbacks
    def get_data(self,q):
        df = self.db.select_dataframe(q)
        self.get_content(df)

    @tornado.web.asynchronous
    def get(self):

        params = {
            "date_range": self.get_argument("date_range","yesterday")
        }                                           

        q = DAILY_DASH % {
            "where": query_helpers.__where_and_eq__(params)
        }

        data = self.get_data(q)


        
