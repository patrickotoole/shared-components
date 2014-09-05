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
    def clean_query(self, query):
        '''Given a Hive query, sanitizes it for use in batch processing'''
        first_char = query[0]
        last_char = query[-1]

        if first_char in ['"', "'"] and last_char in ['"', "'"]:
            query = query[1:]
            query = query[:-1]
        
        query = query.replace("\n", " ")
        query = query.replace("\r", " ")
        query = query.replace(";","")
        query = query.replace("'", "\\'")
        
        return query

    def get(self):
        segments = self.pull_segments()
        request_types = ["domain_list", "hive_query"]

        self.render("../templates/_batch_request.html", segments=segments, request_types=request_types)

    def post(self):
        # Universal parameters
        request_type = self.get_argument("request_type")
        expiration = self.get_argument("expiration", False)
        target_segment = self.get_argument("target_segment", False)
        active = self.get_argument("active")
        owner = self.get_argument("owner")
        comment = self.get_argument("comment")

        # Parameters specific to domain_list
        segment = self.get_argument("segment", False)
        target_window = self.get_argument("target_window", False)

        # Parameters specific to hive_query
        hive_query = self.get_argument("hive_query", False)
        custom_target_segment = self.get_argument("custom_target_segment", False)
        custom_expiration = self.get_argument("custom_expiration", False)

        if not request_type:
            raise StandardError("Missing request type parameter")

        if segment and not target_window:
            raise StandardError("Missing target_window argument")

        if segment:
            query = "INSERT INTO batch_request (type, content, owner, target_segment, expiration, active, comment) VALUES ('{}','{}', '{}', '{}', {}, {}, '{}');".format('domain_list', '#'.join([segment, target_window]), owner, target_segment, expiration, active, comment)
        else:
            if custom_target_segment:
                target_segment = "NULL"
            if custom_expiration:
                expiration = "NULL"
            hive_query = self.clean_query(hive_query)
            print hive_query
            query = "INSERT INTO batch_request (type, content, owner, target_segment, expiration, active, comment) VALUES ('{}','{}', '{}', '{}', {}, {}, '{}');".format('hive_query', hive_query, owner, target_segment, expiration, active, comment)                
        
        self.db.execute(query)
        self.db.commit()

        self.redirect("/admin/batch_requests")
                
