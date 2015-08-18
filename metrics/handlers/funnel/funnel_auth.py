class FunnelAuth(object):

    def funnel_to_advertiser(self, funnel_id):
        query = "SELECT pixel_source_name FROM rockerbox.funnel WHERE funnel_id=%s" % funnel_id
        df = self.db.select_dataframe(query)
        if len(df) < 1:
            return Exception("No funnel found")
        else:
            return df.pixel_source_name[0]

    def check_auth_GET(self):
        funnel = self.get_argument("id",False)
        advertiser = self.get_argument("advertiser", False)

        # If neither is specified, we don't need to return anything
        if not funnel and not advertiser:
            return self.get_secure_cookie("user")

        # If they specified a funnel_id, check that they have access to
        # its advertiser
        if funnel:
            requested_advertiser = self.funnel_to_advertiser(funnel)
            exception_message = "Funnel not found"
        else:
            requested_advertiser = advertiser
            exception_message = ("The specified advertiser either doesn't exist"
                                 " or you do not have access to it")
        
        if (requested_advertiser in self.authorized_advertisers):
            return self.get_secure_cookie("user")
        else:
            raise Exception(exception_message)

    def check_auth_PUT_POST(self):
        body = ujson.loads(self.request.body)
        if "advertiser" not in body:
            return self.get_secure_cookie("user")

        # Check that this user has access to the advertiser they're trying to
        # create a funnel for
        requested_advertiser = body["advertiser"]
        
        if (requested_advertiser in self.authorized_advertisers):
            return self.get_secure_cookie("user")
        else:
            raise Exception(("The specified advertiser either doesn't exist or"
                             " you do not have access to it"))
        return self.get_secure_cookie("user")

    def check_auth_DELETE(self):
        funnel = self.get_argument("id",False)

        # If neither is specified, we don't need to return anything
        if not funnel:
            return self.get_secure_cookie("user")

        requested_advertiser = self.funnel_to_advertiser(funnel)
        exception_message = "Funnel not found"

        if (requested_advertiser in self.authorized_advertisers):
            return self.get_secure_cookie("user")
        else:
            raise Exception(exception_message)

    def get_current_user(self):
        if self.request.method == "GET":
            return self.check_auth_GET()
        elif self.request.method in ["POST", "PUT"]:
            return self.check_auth_PUT_POST()
        elif self.request.method == "DELETE":
            return self.check_auth_DELETE()

