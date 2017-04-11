import logging
import tornado.web
from lib.helpers import *


API_QUERY = "select * from advertiser where %s "


class HindsightHandler(tornado.web.RequestHandler):
    def initialize(self, db, **kwargs):
        self.db = db

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("../templates/hindsight_streaming.html",data=o)

        yield default, (data,)

    def get_data(self):

        where = " active = 1 and deleted = 0 and crusher = 1"
        logging.info(API_QUERY % where)
        df = self.db.select_dataframe(API_QUERY % where).set_index("external_advertiser_id")

        self.get_content(df.reset_index())


    @tornado.web.asynchronous
    def get(self):
        
        self.get_data()
