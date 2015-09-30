import tornado.web
import logging
import sys
import ujson
from lib.helpers import *
from base import BaseHandler
import lib.password_hash as password_hash

logger = logging.getLogger('tcpserver')

PERMISSIONS_QUERY = """
SELECT 
    pixel_source_name, 
    external_advertiser_id, 
    advertiser_name
FROM user a JOIN user_permissions b on (a.id = b.user_id) 
    JOIN permissions_advertiser USING (permissions_id) 
    JOIN advertiser USING (external_advertiser_id) 
WHERE a.username = '%s'
"""

FEATURES_QUERY = """
SELECT 
    name
FROM user a JOIN user_permissions b on (a.id = b.user_id) 
    JOIN permissions_app_features USING (permissions_id) 
    JOIN app_features USING (app_feature_id) 
WHERE a.username = '%s';
"""



USER_QUERY = """
SELECT DISTINCT 
    user.id as id, 
    username, 
    advertiser_id as external_advertiser_id,
    password,
    advertiser_name, 
    pixel_source_name
FROM user 
    JOIN advertiser ON (user.advertiser_id = advertiser.external_advertiser_id)
WHERE username = '%s'"""

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
            logger.info(self.request)
            logger.info(self.request.host)
            host = self.request.host
            if "crusher.apps.marathon.mesos" in host:
                self.redirect(self.get_argument("next", "/crusher", True))
            elif from_db['show_reporting'][0] == 0:
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
            aid = dict_.get('external_advertiser_id')
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
        except Exception as e:
            print e
            self.write("failure")

class AccountPermissionsHandler(BaseHandler):
    def initialize(self,db=None):
        self.db = db

    def get_user_permissions(self, username):
        df = self.db.select_dataframe(PERMISSIONS_QUERY % username)
        
        # If this user doesn't have permissions, default to the advertiser
        # assigned to them in the USER table
        if len(df) > 0:
            permissions = Convert.df_to_values(df)
            return permissions
        else:
            df = self.db.select_dataframe(USER_QUERY % username)
            cols = [
                "external_advertiser_id",
                "pixel_source_name",
                "advertiser_name"
            ]
            df = df[cols]
            return Convert.df_to_values(df)

    def get_user_feature_permissions(self, username):
        df = self.db.select_dataframe(FEATURES_QUERY % username)
        return Convert.df_to_values(df)

    @tornado.web.authenticated
    def get(self):
        advertiser = self.get_argument("advertiser_id", False)
        u = self.get_current_user()
        current_advertiser = self.current_advertiser
        
        advertiser_permissions = self.get_user_permissions(u)
        feature_permissions = self.get_user_feature_permissions(u)

        for p in advertiser_permissions:
            if str(p["external_advertiser_id"]) == str(current_advertiser):
                p["selected"] = True
            else:
                p["selected"] = False

        obj = {
            "results" : {
                "advertisers": advertiser_permissions,
                "feature_permissions": feature_permissions
            }
        }

        self.write(ujson.dumps(obj))

    @tornado.web.authenticated
    def post(self):
        posted = ujson.loads(self.request.body)
        advertiser = str(posted["advertiser_id"])

        u = self.get_current_user()

        permissions = self.get_user_permissions(u)

        # If the user specified an advertiser to switch to, make sure they have
        # permissions for that advertiser and then change their cookie
        if advertiser:
            print advertiser
            print permissions, advertiser
            if [p for p in permissions 
                if str(p['external_advertiser_id']) == str(advertiser)]:
                self.set_secure_cookie("advertiser", advertiser)
            else:
                self.write("{\"error\": \"not permitted to switch to this advertiser\"}")
        self.finish()
