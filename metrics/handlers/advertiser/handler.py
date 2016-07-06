import tornado.web
import ujson
import pandas

from lib.helpers import *
from database import AdvertiserDatabase
from api import AdvertiserAPI
from ..base import BaseHandler

class AdvertiserHandler2(BaseHandler, AdvertiserDatabase, AdvertiserAPI):
    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False)
        self.api = kwargs.get("api",False)

    def post(self):

        body = ujson.loads(self.request.body)

        required_fields = ["pixel_source_name","advertiser_name","client_sld"]
        missing_fields = [i for i in required_fields if i not in body.keys()]

        if len(missing_fields) > 0:
            raise Exception("missing fields %s" % (str(missing_fields)) )

        advertiser_name   = body["advertiser_name"]
        pixel_source_name = body["pixel_source_name"]

        try:

            advertiser_id = self.create_advertiser(advertiser_name)
            internal_id   = self.insert_advertiser(advertiser_id, **body)
            username = self.get_current_user()
            self.associate_advertiser(advertiser_id, username)
            self.set_secure_cookie("advertiser", advertiser_id)

            self.write(ujson.dumps({"id":internal_id,"external_advertiser_id":advertiser_id}))
            self.finish()
        except Exception as e:
            self.set_status(400)
            self.write(ujson.dumps({"error":str(e)}))
            self.finish()


    @tornado.web.asynchronous
    def get(self):
        advertiser_id = self.get_secure_cookie("advertiser")
        if advertiser_id == "0":
            self.render("_make_advertiser.html")
        else:
            d = self.get_advertiser(advertiser_id)
            self.write(ujson.dumps(d))
            self.finish()
