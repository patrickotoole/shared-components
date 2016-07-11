import lib.password_hash as password_hash
from helpers import _create_signature_v2

pw_hash = password_hash.PasswordHash()

INSERT_QUERY = """
INSERT INTO user (advertiser_id, username, password, show_reporting, first_name, last_name, email, nonce) 
VALUES ('%(advertiser)s', '%(username)s', '%(password)s', %(show_reporting)s, '%(first_name)s', '%(last_name)s', '%(email)s', '%(nonce)s')
"""

INSERT_QUERY = """
INSERT INTO user (username, password, email, nonce) 
VALUES ('%(username)s', '%(password)s', '%(email)s', '%(nonce)s')
"""

INSERT_WITH_ADVERTISER_QUERY = """
INSERT INTO user (advertiser_id, username, password, email, nonce) 
VALUES ('%(advertiser_id)s', '%(username)s', '%(password)s', '%(email)s', '%(nonce)s')
"""


UPDATE_QUERY = """
UPDATE user set password = '%(password)s', nonce = NULL where nonce = '%(nonce)s'
"""

CLEAR_NONCE_QUERY = """
UPDATE user set nonce = NULL where nonce = '%(nonce)s'
"""

GET_BY_NONCE = """
select * from user where nonce = '%(nonce)s' 
"""


SECRET = "rickotoole"

class UserDatabase:
    def get_by_nonce(self,nonce):
        objs = self.db.select_dataframe(GET_BY_NONCE % {"nonce":nonce} ).to_dict('records')
        if len(objs) == 0: raise Exception("Nonce mismatch")
        return objs[0]

    def update(self,user_object):

        user_object['password'] = pw_hash.hash_password(user_object["password"])
        obj = self.get_by_nonce(user_object['nonce'])
        self.db.execute(UPDATE_QUERY % user_object)

        df = self.db.select_dataframe("SELECT advertiser_id from user where username = '%s'" % obj['username'])
        advertiser_id = df.ix[0,'advertiser_id']

        return (obj['username'], advertiser_id or 0)
        
    def create(self,user_object):
        username = user_object.get("username") 
        user_object["nonce"] = _create_signature_v2( SECRET, username)

        if user_object.get("password",False) is False:
            user_object["password"] = 'NULL'
        else:
            user_object["password"] = pw_hash.hash_password(user_object["password"])
        
        self.db.execute(INSERT_QUERY % user_object)

        return user_object["username"]
            
    def create_with_advertiser(self,user_object):
        username = user_object.get("username") 
        user_object["nonce"] = _create_signature_v2( SECRET, username)

        if user_object.get("password",False) is False:
            user_object["password"] = 'NULL'
        else:
            user_object["password"] = pw_hash.hash_password(user_object["password"])
        
        self.db.execute(INSERT_WITH_ADVERTISER_QUERY % user_object)

        return user_object["username"]
