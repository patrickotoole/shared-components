import tornado.web
import ujson
import logging
import urllib

from database import ShareDatabase
from schedule import ScheduleDatabase

from ..base import BaseHandler
from send import send


class ShareHandler(BaseHandler,ShareDatabase,ScheduleDatabase):

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
            if "days" in obj:
                obj["msg"] = ""
                obj["name"] = "A scheduled search for " + obj["name"] + " is ready."
                obj["title_override"] = True

                self.make_scheduled(advertiser_id,obj)
                logging.info("New event scheduled for %s: %s" % (advertiser_id,json.dumps(obj)) )

            elif "email" in obj:
                host = "http://" + self.request.headers.get('X-Real-Host',self.request.host)

                url = host + urllib.unquote(obj['urls'][-1]) + "&nonce=" + nonce
                to = obj['email']
                msg = obj['msg']
                title = obj.get('name'," a search ")
                subject = "Someone shared a Hindsight search with you..."
                send(to=to,base_url = url, _msg = msg, subject = subject, title = title, title_override = obj["title_override"])
               
            self.write(nonce)

        self.finish()
