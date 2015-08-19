import tornado.web
import ujson
import pandas

from lib.helpers import Convert
from MYSQL_FUNNEL import *
from funnel_base import FunnelBase, FunnelHelpers
from funnel_auth import FunnelAuth
from funnel_database import FunnelDatabase
from handlers.base import BaseHandler

class FunnelHandler(BaseHandler, FunnelDatabase, FunnelBase, FunnelHelpers, FunnelAuth):

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
            if "funnel_id" not in self.request.body:
                raise Exception("must contain a funnel_id in json to update")
            data = self.make_to_update(self.request.body)
            self.write(ujson.dumps({"response": data, "status": "ok"}))
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))
 
    @tornado.web.authenticated
    def post(self):
        try:
            data = self.make_to_insert(self.request.body)
            self.write(ujson.dumps({"response": data, "status": "ok"}))
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))

    @tornado.web.authenticated
    def delete(self):
        funnel_id = self.get_argument("funnel_id",False)

        if funnel_id:
            obj = {"funnel_id": funnel_id}

            try:
                self.db.autocommit = False
                conn = self.db.create_connection()
                cur = conn.cursor()
                
                cur.execute(DELETE_FUNNEL % obj)
                cur.execute(DELETE_FUNNEL_ACTION_BY_ID % obj)

                conn.commit()
                self.write("{'status':'removed'}") 
            except Exception as e:
                self.write("{'status':'%s'}" % e) 
            finally:
                self.db.autocommit = True
                self.finish() 
            
    
