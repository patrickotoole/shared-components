import logging
from oauth2client.client import flow_from_clientsecrets
from oauth2client.client import FlowExchangeError
from oauth2client import tools
import oauth2client
from apiclient.discovery import build
from slack_exceptions import *
# ...

import httplib2



CLIENTSECRETS_LOCATION = 'secrets.json'
REDIRECT_URI = 'http://192.168.99.100:8888/callback'
SCOPES = [
    'team:read',
    'channels:read',
    'chat:write:bot'
]



def store_credentials(user_id, credentials):
  print user_id, credentials


def exchange_code(authorization_code):
  """Exchange an authorization code for OAuth 2.0 credentials.

  Args:
    authorization_code: Authorization code to exchange for OAuth 2.0
                        credentials.
  Returns:
    oauth2client.client.OAuth2Credentials instance.
  Raises:
    CodeExchangeException: an error occurred.
  """
  flow = flow_from_clientsecrets(CLIENTSECRETS_LOCATION, ' '.join(SCOPES))
  flow.redirect_uri = REDIRECT_URI
  try:
    credentials = flow.step2_exchange(authorization_code)
    return credentials
  except FlowExchangeError, error:
    logging.error('An error occurred: %s', error)
    raise CodeExchangeException(None)


def get_user_info(credentials):
  """Send a request to the UserInfo API to retrieve the user's information.

  Args:
    credentials: oauth2client.client.OAuth2Credentials instance to authorize the
                 request.
  Returns:
    User information as a dict.
  """
  http=credentials.authorize(httplib2.Http())
  user_info = None
  try:
    (resp_headers, content) = http.request("https://api.slack.com/v1/people/~?format=json", "GET")
    import json
    user_info = json.loads(content)
    return user_info
  except errors.HttpError, e:
    logging.error('An error occurred: %s', e)



def get_authorization_url(email_address, state, redirect_uri=False):
  """Retrieve the authorization URL.

  Args:
    email_address: User's e-mail address.
    state: State for the authorization URL.
  Returns:
    Authorization URL to redirect the user to.
  """
  flow = flow_from_clientsecrets(CLIENTSECRETS_LOCATION, ' '.join(SCOPES))
  flow.params['state'] = state
  flow.params['response_type'] = "code"
  return flow.step1_get_authorize_url()


def get_credentials(authorization_code, state):
  """Retrieve credentials using the provided authorization code.

  This function exchanges the authorization code for an access token and queries
  the UserInfo API to retrieve the user's e-mail address.
  If a refresh token has been retrieved along with an access token, it is stored
  in the application database using the user's e-mail address as key.
  If no refresh token has been retrieved, the function checks in the application
  database for one and returns it if found or raises a NoRefreshTokenException
  with the authorization URL to redirect the user to.

  Args:
    authorization_code: Authorization code to use to retrieve an access token.
    state: State to set to the authorization URL in case of error.
  Returns:
    oauth2client.client.OAuth2Credentials instance containing an access and
    refresh token.
  Raises:
    CodeExchangeError: Could not exchange the authorization code.
    NoRefreshTokenException: No refresh token could be retrieved from the
                             available sources.
  """
  # email_address = ''
  credentials = exchange_code(authorization_code)

  # user_info = get_user_info(credentials)
  # email_address = user_info.get('email')
  # user_id = user_info.get('id')
  user_id = 0
  store_credentials(user_id, credentials)
  return credentials


if __name__ == "__main__":
    url = get_authorization_url("rick@rockerbox.com","hello")
    code = ''

    get_credentials(code,"loggedin")
    print "ASDF"
