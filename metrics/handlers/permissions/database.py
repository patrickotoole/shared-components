from lib.helpers import *

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

SUBSCRIPTION_QUERY = """
SELECT
    subscription_id, s.active, name
FROM user a JOIN user_permissions b on (a.id = b.user_id)
    JOIN permissions_subscription USING (permissions_id)
    JOIN subscription s USING (subscription_id)
WHERE a.username = '%s' and s.active = 1;
"""



class PermissionsDatabase:

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

    def get_user_subscription_permissions(self, username):
        df = self.db.select_dataframe(SUBSCRIPTION_QUERY % username)
        return Convert.df_to_values(df)

    def get_user_feature_permissions(self, username):
        df = self.db.select_dataframe(FEATURES_QUERY % username)
        return Convert.df_to_values(df)
