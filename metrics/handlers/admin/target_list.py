import tornado.web
import ujson
import pandas
import StringIO

from twisted.internet import defer
from lib.helpers import * 

API_QUERY = "select * from reporting.domain_list_status where action = 'approve' and %s "
SUMMARY_QUERY = "SELECT log, action, count(*) count from reporting.domain_list_status group by 1,2"

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

    @decorators.formattable
    def make_table(self,data):
        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("../templates/admin/domain_list/index.html",data=o)

        yield default, (data,)


    def get_summary(self):
        df = self.db.select_dataframe(SUMMARY_QUERY)
        df = df.set_index(["log","action"])['count'].unstack("action").fillna(0).reset_index()
        self.make_table(df)


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
        if domain_list == "summary":
            self.get_summary()
        else:
            self.get_data(domain_list)
