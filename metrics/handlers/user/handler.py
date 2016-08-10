import tornado.web
import ujson
import logging

from database import UserDatabase
import send as email
import send_invite as invite

class UserHandler(tornado.web.RequestHandler,UserDatabase):

    def initialize(self,db=None):
        self.db = db

    def get(self):
        nonce = self.get_argument("nonce",False) 

        try: _dicts = self.get_by_nonce(nonce)
        except: _dicts = []

        #if len(_dicts) == 0: self.redirect("/login")

        self.render("_make_advertiser.html")
        return

    def login(self,username, advertiser="0"):
        self.set_secure_cookie("user",username)
        self.set_secure_cookie("advertiser",str(advertiser))

    def put(self):
        try:
            body = ujson.loads(self.request.body)
            username, advertiser_id = self.update(body)
      
            self.login(username, advertiser_id)
            self.write("""{"username":"%s"}""" % username)
            self.finish()
        except Exception as e:
            e
            self.set_status(400)
            resp = ujson.dumps({"error":str(e)})
            self.write(resp)
            self.finish()


    def post(self):
        try:
            body = ujson.loads(self.request.body)
            if body.get("advertiser_id"):
                username = self.create_with_advertiser(body)
                if body.get("invite"): invite.send(username)
            else:
                username = self.create(body)
                logging.info("Created advertiser: %s" % username)
                self.login(username)
                email.send(username)
            self.write("""{"username":"%s"}""" % username)
            self.finish()
        except Exception as e:
            e
            self.set_status(400)
            resp = ujson.dumps({"error":str(e)})
            self.write(resp)
            self.finish()

