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
            query = "UPDATE batch_request SET active=0 WHERE id={}".format(deactivate_request)
            self.db.execute(query)
            self.db.commit()
            self.redirect("/admin/batch_requests")
        elif activate_request:
            query = "UPDATE batch_request SET active=1 WHERE id={}".format(activate_request)
            self.db.execute(query)
            self.db.commit()
            self.redirect("/admin/batch_requests")
        else:
            requests = self.db.select_dataframe("select * from batch_request")
            self.render("../templates/_batch_requests.html", data=requests.to_html(classes=["dataframe"]))
        
        
class BatchRequestHandler(BatchRequestBase):
    def get(self):
        segments = self.pull_segments()
        
        self.render("../templates/_batch_request.html", segments=segments)

    def post(self):
        segment = self.get_argument("segment", False)
        hive_query = self.get_argument("hive_query", False)
        expiration = self.get_argument("expiration")
        target_segment = self.get_argument("target_segment")
        target_window = self.get_argument("target_window")
        active = self.get_argument("active")
        owner = self.get_argument("owner")
        comment = self.get_argument("comment")

        if (segment and hive_query) or not (segment or hive_query):
            raise StandardError("Missing an argument")

        if segment:
            # I don't think we need this any more, but not positive, so leaving
            # it for now
            #log = self.db.select_dataframe("SELECT DISTINCT log FROM domain_list WHERE segment='{}'".format(segment))['log'].tolist()[0]
            query = "INSERT INTO batch_request (type, content, owner, target_segment, target_window, expiration, active, comment) VALUES ('{}','{}', '{}', '{}', {}, {}, {}, '{}');".format('domain_list', segment, owner, target_segment, target_window, expiration, active, comment)
        else:
            query = "INSERT INTO batch_request (type, content, owner, target_segment, target_window, expiration, active, comment) VALUES ('{}','{}', '{}', '{}', {}, {}, {}, '{}');".format('hive_query', hive_query, owner, target_segment, target_window, expiration, active, comment)
        
        self.db.execute(query)
        self.db.commit()

        self.redirect("/admin/batch_requests")
                
