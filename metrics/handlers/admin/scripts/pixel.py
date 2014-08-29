import tornado.web
from lib.helpers import *

MYSQL_QUERY="select advertiser_name, pixel_source_name, external_advertiser_id, deleted, active, min_report_date from advertiser where not pixel_source_name = 'None'"

class PixelHandler(tornado.web.RequestHandler):
    def initialize(self, db=None, **kwargs):
        self.db = db 

    @decorators.formattable
    def get(self):
        data = self.db.select_dataframe(MYSQL_QUERY)

        def default(self,data):
            _json = Convert.df_to_json(data)
            self.render("admin/pixel.html", data=_json) 

        yield default, (data,)
 
