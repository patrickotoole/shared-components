import tornado.web
import logging
import sys
import ujson
import lib.password_hash as password_hash

logger = logging.getLogger('tcpserver')

USER_QUERY = "SELECT id, username, advertiser_id, password from user where username = '%s'"

pw_hash = password_hash.PasswordHash()

class LoginHandler(tornado.web.RequestHandler):

    def initialize(self,db=None):
        self.db = db

    def _check_password(self,submitted,stored):
        return pw_hash.check_password(submitted,stored)

    def get(self):

        if self.get_secure_cookie("user"):
            self.redirect(self.get_argument("next", None, True))
        else:
            self.render("_login.html",message = "sign in")

    def post(self):
        body = ujson.loads(self.request.body)
        username = body["username"]
        password = body.get("password","")
        lookup = self.db.select(USER_QUERY % username).fetchall() 

        if len(lookup) > 0 and self._check_password(password,lookup[0][3]):
            self.set_secure_cookie("advertiser",str(lookup[0][2]))
            self.set_secure_cookie("user",username)
            self.write("1")
        else:
            self.write("0")



class SignupHandler(tornado.web.RequestHandler):

    INSERT_QUERY = "insert into user (username, advertiser_id, password) values ('%(username)s' ,'%(advertiser)s', '%(password)s')"

    def initialize(self,db=None):
        self.db = db

    def get(self):
        if self.get_secure_cookie("user"):
            self.write("already signed up")
        else:
            self.write("signup page")

    def create(self,to_create):
        validate = to_create.get("username",False) and to_create.get("password",False)
        
        if validate:
            to_create["password"] = pw_hash.hash_password(to_create["password"])

            self.db.execute(self.INSERT_QUERY % to_create)
            self.db.commit()
            return to_create["username"]
        else:
            raise Exception

    def login(self,username):
        self.set_secure_cookie("user",username)
        

    def post(self):
        try:
            body = ujson.loads(self.request.body)
            created = self.create(body)
            self.login(created)
            self.write("success")
        except:
            self.write("failure")


