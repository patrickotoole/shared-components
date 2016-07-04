import tornado.web
import ujson

from pixels.database import PixelDatabase

class AdvertiserPixelHandler(tornado.web.RequestHandler,PixelDatabase):

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
