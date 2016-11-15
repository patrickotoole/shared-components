import lib.password_hash as password_hash

GET_USER = """
SELECT 
    user.id, user.advertiser_id, user.username, user.show_reporting, 
    user.first_name, user.last_name, user.email as user_email, 
    CASE WHEN ae.email like '' THEN user.username ELSE (CASE WHEN user.username not like 'a_%%' THEN ae.email ELSE user.username END) END as email 
FROM user 
LEFT JOIN (
    SELECT external_advertiser_id, email 
    FROM advertiser_email 
    GROUP BY external_advertiser_id
) ae 
ON user.advertiser_id = ae.external_advertiser_id 
WHERE username = '%s'
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
    LEFT JOIN advertiser ON (user.advertiser_id = advertiser.external_advertiser_id)
WHERE username = '%s'
"""

pw_hash = password_hash.PasswordHash()

class LoginDatabase:

    def get_user(self,username):
        query = GET_USER % username
        df = self.db.select_dataframe(query)
        return df.T.to_dict().values()[0]

    def _check_password(self,submitted,stored):
        return pw_hash.check_password(submitted,stored)

    def check(self,username,password):
        df = self.db.select_dataframe(USER_QUERY % username)
        if df.empty:
            return 0
        
        return self._check_password(password,df.password[0])


