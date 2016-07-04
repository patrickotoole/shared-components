import tornado.web
import ujson

from pixels.database import PixelDatabase
from pixels.api import PixelAPI


class AdvertiserPixelHandler(tornado.web.RequestHandler,PixelDatabase,PixelAPI):

    def initialize(self, db=None, api=None):
        self.db = db
        self.api = api

    def get(self,advertiser_id):

        with_comment = self.get_argument("include_comment",False)
        template_type = self.get_argument("type","script")
        implementation = self.get_argument("implementation","media")

        pixels = self.get_pixel(advertiser_id, template_type, implementation, with_comment)

        self.set_header('Content-Type','application/javascript')
        self.write(ujson.dumps(pixels))
        self.finish()

    def post(self,advertiser_id):

        body = ujson.loads(self.request.body)

        required_fields = ["segment_name","segment_type"]
        missing_fields = [i for i in required_fields if i not in body.keys()]

        if len(missing_fields) > 0:
            raise Exception("missing fields %s" % (str(missing_fields)) )

        advertiser_id, pixel_source_name, _ = self.get_advertiser(advertiser_id)

        pixels = self.create_pixel(advertiser_id, pixel_source_name, body["segment_name"], body["segment_type"])
        self.insert_pixel(pixels, pixel_source_name, advertiser_id)

        self.set_header('Content-Type','application/javascript')
        self.write(ujson.dumps(body))
        self.finish()
