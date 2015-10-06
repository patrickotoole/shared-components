import tornado.web
import ujson
import pandas

from handlers.base import BaseHandler
from lib.helpers import Convert

from action_auth import ActionAuth
from action_database import ActionDatabase
from lib.helpers import APIHelpers

 
class PatternStatusHandler(BaseHandler,ActionAuth,APIHelpers):

    def initialize(self, db=None, **kwargs):
        self.db = db 
        self.required_cols = ["advertiser", "action_name", "operator"]
    

    @tornado.web.authenticated
    def get(self):
        advertiser = self.get_argument("advertiser", self.current_advertiser_name)
        pattern = self.get_argument("pattern",False)

        SQL = "SELECT * FROM pattern_cache where url_pattern =  '%s' and pixel_source_name = '%s'"

        try:
            results = self.db.select_dataframe(SQL % (pattern,advertiser))
            self.write_response(Convert.df_to_values(results))
        except Exception, e:
            self.write_response(str(e),e)
