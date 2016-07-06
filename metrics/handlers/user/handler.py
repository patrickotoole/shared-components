import tornado.web
import ujson

from database import UserDatabase

class UserHandler(tornado.web.RequestHandler,UserDatabase):

    def initialize(self,db=None):
        self.db = db

    def get(self):
        nonce = self.get_argument("nonce",False) 

        try: _dicts = self.get_by_nonce(nonce)
        except: _dicts = []

        if len(_dicts) == 0: self.redirect("/login")

        self.render("_make_advertiser.html")
        return

    def login(self,username):
        self.set_secure_cookie("user",username)
        self.set_secure_cookie("advertiser","0")

    def put(self):
        try:
            body = ujson.loads(self.request.body)
            username = self.update(body)
            self.login(username)
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
            username = self.create(body)
            self.login(username)
            self.write("""{"username":"%s"}""" % username)
            self.finish()
        except Exception as e:
            e
            self.set_status(400)
            resp = ujson.dumps({"error":str(e)})
            self.write(resp)
            self.finish()

