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
            user = self.get_secure_cookie("user")
            Q = "select user.id, user.advertiser_id, user.username, user.show_reporting, CASE WHEN ae.email like '' THEN user.username ELSE (CASE WHEN user.username not like 'a_%%' THEN ae.email ELSE user.username END) END as email from user left join (select external_advertiser_id, email from advertiser_email group by external_advertiser_id) ae on user.advertiser_id = ae.external_advertiser_id where username = '%s'" % user
            print Q
            from_db = self.db.select_dataframe(Q )
            print from_db
            if self.get_argument("format",False) == "json":
                self.write(ujson.dumps(from_db.T.to_dict().values()[0]))
                self.finish()
                return

            if from_db['show_reporting'][0] == 0:
                self.redirect(self.get_argument("next", "/advertiser", True))
            else:
                self.redirect(self.get_argument("next", "/reporting", True))
        else:
            self.render("_login.html",message = "sign in")

    def post(self):
        body = ujson.loads(self.request.body)
        username = body["username"]
        password = body.get("password","")
        df = self.db.select_dataframe(USER_QUERY % username)

        if not df.empty:
            dict_ = df.to_dict(outtype='records')[0]
            pw = dict_.get('password')
            aid = dict_.get('advertiser_id')
            if self._check_password(password, pw):
                self.set_secure_cookie("advertiser",str(aid))
                self.set_secure_cookie("user",username)
                self.write("1")
                return

        self.write("0")

class SignupHandler(tornado.web.RequestHandler):

    INSERT_QUERY = "insert into user (username, advertiser_id, password, show_reporting) values ('%(username)s' ,'%(advertiser)s', '%(password)s', '%(show_reporting)s')"

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


