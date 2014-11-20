import tornado.web
import ujson
import pandas
import StringIO

from twisted.internet import defer
from lib.helpers import * 

SUMMARY_QUERY = "SELECT log, action, count(*) count from reporting.domain_list_status group by 1,2"

class DomainListHandler(tornado.web.RequestHandler):
    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

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

    @tornado.web.asynchronous
    def get(self,domain_list=False):
        self.get_summary()
