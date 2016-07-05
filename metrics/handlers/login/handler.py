import tornado.web
import ujson
from database import LoginDatabase

class LoginHandler(tornado.web.RequestHandler,LoginDatabase):

    def initialize(self,db=None):
        self.db = db

    def get(self):

        user = self.get_secure_cookie("user")

        if not user: 
            return self.render("_login.html",message = "sign in")

        user_obj = self.get_user(user)

        if self.get_argument("format",False) == "json":

            self.write(ujson.dumps(user_obj))
            self.finish()
        else:
            _next = "/reporting"
            if "crusher.apps.marathon.mesos" in self.request.host: _next = "/crusher"
            
            self.redirect(self.get_argument("next", _next, True))
        

    def post(self):
        body = ujson.loads(self.request.body)
        username = body["username"]
        password = body.get("password","")

        if not self.check(username,password):
            self.write("0")
            self.finish()

        else:
            user = self.get_user(username)
            self.set_secure_cookie("advertiser",str(user["advertiser_id"]) )
            self.set_secure_cookie("user",user["username"])
            self.write("1")
            self.finish()

