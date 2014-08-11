import tornado.web
import ujson
import pandas
import StringIO
from lib.helpers import *

from lib.query.MYSQL import *
from lib.query.HIVE import *
import lib.query.helpers as query_helpers

class BatchRequestBase(tornado.web.RequestHandler):

    def initialize(self, db, api, hive):
        self.db = db 
        self.api = api
        self.hive = hive

    def pull_segments(self):
        segments = self.db.select_dataframe("select distinct segment from domain_list")
        print segments
        return segments['segment'].tolist()

class BatchRequestsHandler(BatchRequestBase):
    def get(self):
        deactivate_request = self.get_argument("deactivate_request", default=False)
        activate_request = self.get_argument("activate_request", default=False)
        
        if deactivate_request:
            query = "UPDATE batch_domain_segments SET active=0 WHERE id={}".format(deactivate_request)    
            self.db.execute(query)
            self.db.commit()
            self.redirect("/admin/batch_requests")
        elif activate_request:
            query = "UPDATE batch_domain_segments SET active=1 WHERE id={}".format(activate_request)
            self.db.execute(query)
            self.db.commit()
            self.redirect("/admin/batch_requests")
        else:
            requests = self.db.select_dataframe("select * from batch_domain_segments")
            self.render("../templates/_batch_requests.html", data=requests.to_html(classes=["dataframe"]))
        
        
class BatchRequestHandler(BatchRequestBase):
#    @decorators.formattable
    def get(self):
        segments = self.pull_segments()        
        self.render("../templates/_batch_request.html", segments=segments)

    def post(self):
        segment = self.get_argument("segment")
        expiration = self.get_argument("expiration")
        target_segment = self.get_argument("target_segment")
        target_window = self.get_argument("target_window")
        active = self.get_argument("active")

        log = self.db.select_dataframe("select distinct log from domain_list where segment='{}'".format(segment))['log'].tolist()[0]

        query = "INSERT INTO batch_domain_segments (log, segment, target_segment, target_window, expiration, active) VALUES ('{}', '{}', '{}', {}, {}, {});".format(log, segment, target_segment, target_window, expiration, active)

        self.db.execute(query)
        self.db.commit()

        self.redirect("/admin/batch_requests")
                
