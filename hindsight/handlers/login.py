import tornado.web
import ujson
import logging
from database import LoginDatabase

class LoginHandler(tornado.web.RequestHandler,LoginDatabase):

    def initialize(self,**kwargs):
        self.db = kwargs.get('db', False)

    def logout(self):

        self.clear_cookie("user")
        self.clear_cookie("advertiser")

        return self.redirect("/login")


    def get(self):
        if "logout" in self.request.uri: return self.logout()
        user = self.get_secure_cookie("user")

        if not user: 
            return self.render("_login.html",message = "sign in")

        user_obj = self.get_user(user)

        if self.get_argument("format",False) == "json":

            self.write(ujson.dumps(user_obj))
            self.finish()
        else:
            _next = "/crusher/dashboard"
            
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
            
            self.set_secure_cookie("advertiser",str(user["advertiser_id"] or 0) )
            self.set_secure_cookie("user",user["username"])
            logging.info("Logged in: %s" % user["username"])
            self.write("1")
            self.finish()

