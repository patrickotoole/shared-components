import tornado.web
import ujson
from ..base import BaseHandler



class IntegrationHandler(BaseHandler):

    def initialize(self,db=None):
        self.db = db

    def get(self):
        advertiser = self.current_advertiser
        df = self.db.select_dataframe("select * from advertiser_slack where advertiser_id = %s" % advertiser)
        self.render("_integrations.html",has_advertiser=len(df))
        return

