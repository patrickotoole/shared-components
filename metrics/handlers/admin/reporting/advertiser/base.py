import pandas
import tornado.web
import ujson

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_spark_sql_session_deferred

import viewable

OPTIONS = {
    "groupings": {
        "viewable" : viewable.GROUPS.keys()
    },
    "fields": {
        "viewable" : viewable.FIELDS.keys()
    }
}

class AdvertiserReportingHandler(tornado.web.RequestHandler):

    def initialize(self, db=None, api=None, hive=None, spark_sql=None, reporting_db =None, **kwargs):
        self.reporting.db = db
        self.db = db 
        self.api = api
        self.hive = hive
        self.spark_sql = spark_sql

    @decorators.formattable
    def get_content(self,data=False):

        def default(self,data):
            j = ujson.dumps(OPTIONS)
            self.render("admin/reporting/target_list.html",data=j)

        yield default, (data,)
    
    @tornado.web.asynchronous
    def get(self,meta=False):
        self.get_content()

 
