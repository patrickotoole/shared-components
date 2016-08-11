import tornado.web
import ujson
from ..base import BaseHandler



class IntegrationHandler(BaseHandler):

    def initialize(self,db=None):
        self.db = db

    @tornado.web.authenticated
    def get(self):
        advertiser = self.current_advertiser
        if advertiser != None:
            df = self.db.select_dataframe("select * from advertiser_slack where advertiser_id = %s" % advertiser)
        else:
            df = []
        self.render("_integrations.html",has_advertiser=len(df))
        return
