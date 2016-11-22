from googleads import oauth2
from googleads import adwords
from oauth2client import client

class RB():
    def __init__(self):
        self.client_id = '453433133828-9gvcn3vqs6gsb787sisb7vbl062lhggb.apps.googleusercontent.com'
        self.client_secret = 'kklHsCFiRv06CDPFDe93lyEL'
        self.redirect_uri = 'http://hindsight.getrockerbox.com/integrations/adwords/callback'
        self.developer_token = 'l7GkOHpSh0XJoQZtZ5fRxg'
        self.flow = client.OAuth2WebServerFlow(
            client_id = self.client_id,
            client_secret = self.client_secret,
            scope = [oauth2.GetAPIScope('adwords'),'https://www.googleapis.com/auth/adwords'],
            user_agent = 'Rockerbox',
            redirect_uri = self.redirect_uri)
        self.flow.params['access_type'] = 'offline'
        self.flow.params['approval_prompt'] = 'force'
