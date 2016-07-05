import tornado.web
from database import UserDatabase

class UserHandler(tornado.web.RequestHandler,UserDatabase):

    def initialize(self,db=None):
        self.db = db

    def get(self):
        self.redirect("/login")

    def login(self,username):
        self.set_secure_cookie("user",username)
        self.set_secure_cookie("advertiser","0")

    def post(self):
        try:
            body = ujson.loads(self.request.body)
            username = self.create(body)
            self.login(username)
            self.write("""{"username":"%s"}""" % username)
            self.finish()
        except Exception as e:
            self.write('{"error":"%s"}' % (str(e)) )
            self.finish()

