import ujson
from tornado import web
import tornado
from adwords import AdWords

QUERY = "select status from advertiser_adwords where advertiser_id = %s"

class IndexHandler(tornado.web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db',None)
        self.adwords = kwargs.get('adwords',None)

    def check_db(self,advertiser_id):
        df = self.db.select_dataframe(QUERY % advertiser_id)
        if len(df) > 0:
            resp = df['status'][0]
        else:
            resp = None
        return resp

    def get(self):
        auth_uri = self.adwords.RB.flow.step1_get_authorize_url()
        advertiser_id = self.get_secure_cookie('advertiser')
        status = self.check_db(advertiser_id)
        if status:
            raw_data = {"status":status,"adid":advertiser_id}
            self.render("templates/core.html",data=raw_data)
        else:
            raw_data = {"adid":advertiser_id}
            self.render("templates/core2.html",data=raw_data)
