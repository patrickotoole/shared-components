import tornado.web
import ujson
import pandas

from lib.helpers import *
from advertiser.database import AdvertiserDatabase
from advertiser.api import AdvertiserAPI


class AdvertiserHandler2(tornado.web.RequestHandler, AdvertiserDatabase, AdvertiserAPI):
    def initialize(self, db, api):
        self.db = db
        self.api = api

    def post(self,arg=False):

        body = ujson.loads(self.request.body)

        required_fields = ["pixel_source_name","advertiser_name","client_sld"]
        missing_fields = [i for i in required_fields if i not in body.keys()]

        if len(missing_fields) > 0:
            raise Exception("missing fields %s" % (str(missing_fields)) )

        advertiser_name   = body["advertiser_name"]
        pixel_source_name = body["pixel_source_name"]

        try:

            advertiser_id = self.create_advertiser(advertiser_name)
            internal_id   = self.insert_advertiser(advertiser_id, advertiser_name, pixel_source_name, **body)
            self.write(ujson.dumps({"id":internal_id,"external_advertiser_id":advertiser_id}))
            self.finish()
        except Exception as e:
            self.set_status(400)
            self.write(ujson.dumps({"error":str(e)}))
            self.finish()


    @tornado.web.asynchronous
    def get(self,advertiser):
        d = dict(zip(("external_advertiser_id", "pixel_source_name"),self.get_advertiser(advertiser)))
        self.write(ujson.dumps(d))
        self.finish()
