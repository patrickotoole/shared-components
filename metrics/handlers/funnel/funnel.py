import tornado.web
import ujson
import pandas

from lib.helpers import Convert
from lib.helpers import APIHelpers
from MYSQL_FUNNEL import *
from funnel_base import FunnelHelpers
from funnel_auth import FunnelAuth
from funnel_database import FunnelDatabase
from handlers.base import BaseHandler

class FunnelHandler(BaseHandler, FunnelDatabase, FunnelAuth, APIHelpers):

    def initialize(self, db=None, api=None, **kwargs):
        self.db = db
        self.api = api

        self.required_cols = [
            "funnel_name",
            "actions",
            "owner"
        ]

    @tornado.web.authenticated
    def get(self,*args):
        format = self.get_argument("format",False)
        advertiser = self.get_argument("advertiser", False)
        _id = self.get_argument("id", False)
        
        if not advertiser:
            advertiser = self.current_advertiser_name

        if format == "json":
            if _id:
                results = self.get_funnel(_id)
            else:
                results = self.get_funnels(advertiser)

            self.write(results)
            self.finish()
        else:
            self.render("analysis/visit_urls.html",data="{}", advertiser=advertiser)

    @tornado.web.authenticated
    def put(self):
        try:
            data = self.update_funnel(self.request.body)
            self.write(ujson.dumps({"response": data, "status": "ok"}))
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))
 
    @tornado.web.authenticated
    def post(self):
        try:
            data = self.insert_funnel(self.request.body)
            self.write(ujson.dumps({"response": data, "status": "ok"}))
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))

    @tornado.web.authenticated
    def delete(self):
        try:
            data = self.delete_funnel()
            self.write(ujson.dumps({"response": data, "status": "ok"}))
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))
