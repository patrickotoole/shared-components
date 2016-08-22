import tornado.web
import ujson
import logging
import urllib

from database import ShareDatabase
from ..base import BaseHandler
from send import send


class ShareHandler(BaseHandler,ShareDatabase):

    def initialize(self,db=None):
        self.db = db

    def get(self):
        nonce = self.get_argument("nonce",False)
        advertiser_id = self.lookup_nonce(nonce)
        if advertiser_id:
            # DO A WHOLE BUNCH OF AUTH STUFF TO COOKIE
            self.write(str(advertiser_id))
        else:
            self.set_status(403)
        self.finish()
        

    @tornado.web.authenticated
    def post(self):

        advertiser_id = self.get_current_advertiser()
        if advertiser_id:
            obj = ujson.loads(self.request.body)
            nonce = self.make_share(advertiser_id,obj)
            if "email" in obj:
               host = "http://" + self.request.headers.get('X-Real-Host',self.request.host)

               url = host + urllib.unquote(obj['urls'][-1]) + "&nonce=" + nonce
               to = obj['email']
               msg = obj['msg']
               send(to=to,base_url = url, _msg = msg)
               
            self.write(nonce)

        self.finish()
