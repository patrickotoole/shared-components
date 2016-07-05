import lib.password_hash as password_hash

pw_hash = password_hash.PasswordHash()

INSERT_QUERY = """
INSERT INTO user (advertiser_id, username, password, show_reporting, first_name, last_name, email) 
VALUES ('%(advertiser)s', '%(username)s', '%(password)s', %(show_reporting)s, '%(first_name)s', '%(last_name)s', '%(email)s')
"""

class UserDatabase:

    def create(self,user_object):
        is_valid = user_object.get("username",False) and user_object.get("password",False)
        if not is_valid: raise Exception("Not valid")

        user_object["password"] = pw_hash.hash_password(user_object["password"])
        self.db.execute(INSERT_QUERY % user_object)

        return user_object["username"]
            


