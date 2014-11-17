import tornado.web
import ujson
import pandas
import StringIO

from twisted.internet import defer
from lib.helpers import * 

API_QUERY = "select * from domain_list where %s "

class TargetListHandler(tornado.web.RequestHandler):
    def initialize(self, db, api):
        self.db = db 
        self.api = api

    @decorators.formattable
    def get_content(self,data):
        
        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("../templates/admin/advertiser/domain_list.html",data=o)

        yield default, (data,)

    def get_data(self,domain_list=False):

        advertiser_id = self.get_argument("advertiser_id",False)
        where = "1=1"
        if domain_list:
            where += " and log like '%%%s%%'" % domain_list
        if advertiser_id:
            where += " and external_advertiser_id = %s" % advertiser_id

        print API_QUERY % where
        df = self.db.select_dataframe(API_QUERY % where)
        self.get_content(df)
        

    @tornado.web.asynchronous
    def get(self,domain_list=False):
        self.get_data(domain_list)