import tornado.web

from lib.helpers import decorators, Convert
from handlers.admin.scripts.pixel_status import PixelStatusHandler
from handlers.admin.scripts.pixel_lookup import PixelLookupHandler


class PixelHandler(PixelStatusHandler):

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.write(df)
            self.finish()

        yield default, (data,)

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        advertiser = self.current_advertiser_name
        segment = self.get_argument("segment", False)
        
        self.get_segments(advertiser, segment)


class LookupHandler(PixelLookupHandler):

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.write(df)
            self.finish()

        yield default, (data,)

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        advertiser = self.current_advertiser_name
        segment = self.get_argument("segment", False)
        uid = self.get_argument("uid", False)

        self.get_segments(advertiser, segment, uid)

class CookieHandler(PixelLookupHandler):

    @tornado.web.authenticated
    def get(self):
        uid = self.get_argument("uid", False)

        self.set_cookie("an_uuid",uid)
        self.finish()
