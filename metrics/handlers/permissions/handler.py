import tornado.web
import ujson

from ..base import BaseHandler
from database import PermissionsDatabase

class AccountPermissionsHandler(BaseHandler,PermissionsDatabase):

    def initialize(self,db=None):
        self.db = db

    @tornado.web.authenticated
    def get(self):
        advertiser = self.get_argument("advertiser_id", False)
        u = self.get_current_user()

        current_advertiser = self.get_secure_cookie("advertiser")

        advertiser_permissions = self.get_user_permissions(u)
        feature_permissions = self.get_user_feature_permissions(u)
        subscription_permissions = self.get_user_subscription_permissions(u)


        for p in advertiser_permissions:
            if str(p["external_advertiser_id"]) == str(current_advertiser):
                p["selected"] = True
            else:
                p["selected"] = False

        obj = {
            "results" : {
                "advertisers": advertiser_permissions,
                "subscriptions": subscription_permissions,
                "feature_permissions": feature_permissions
            }
        }

        self.write(ujson.dumps(obj))
        self.finish()

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
