import logging
from oauth2client.client import flow_from_clientsecrets
from oauth2client.client import FlowExchangeError
from oauth2client import tools
import oauth2client
from apiclient.discovery import build
from gmail_exceptions import *
# ...

import httplib2
import mock
flags = mock.MagicMock()

flags.logging_level = "ERROR"



# Path to client_secrets.json which should contain a JSON document such as:
#   {
#     "web": {
#       "client_id": "[[YOUR_CLIENT_ID]]",
#       "client_secret": "[[YOUR_CLIENT_SECRET]]",
#       "redirect_uris": [],
#       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
#       "token_uri": "https://accounts.google.com/o/oauth2/token"
#     }
#   }
CLIENTSECRETS_LOCATION = 'secrets.json'
REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    # Add other requested scopes.
]


def get_stored_credentials(user_id):
  """Retrieved stored credentials for the provided user ID.

  Args:
    user_id: User's ID.
  Returns:
    Stored oauth2client.client.OAuth2Credentials if found, None otherwise.
  Raises:
    NotImplemented: This function has not been implemented.
  """
  # TODO: Implement this function to work with your database.
  #       To instantiate an OAuth2Credentials instance from a Json
  #       representation, use the oauth2client.client.Credentials.new_from_json
  #       class method.
  print user_id
  raise NotImplementedError()


def store_credentials(user_id, credentials):
  """Store OAuth 2.0 credentials in the application's database.

  This function stores the provided OAuth 2.0 credentials using the user ID as
  key.

  Args:
    user_id: User's ID.
    credentials: OAuth 2.0 credentials to store.
  Raises:
    NotImplemented: This function has not been implemented.
  """
  # TODO: Implement this function to work with your database.
  #       To retrieve a Json representation of the credentials instance, call the
  #       credentials.to_json() method.
  print user_id, credentials


def exchange_code(authorization_code,uri=False):
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
  flow.redirect_uri = uri or REDIRECT_URI
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
  user_info_service = build(
      serviceName='oauth2', version='v2',
      http=credentials.authorize(httplib2.Http()))
  user_info = None
  try:
    user_info = user_info_service.userinfo().get().execute()
  except errors.HttpError, e:
    logging.error('An error occurred: %s', e)
  if user_info and user_info.get('id'):
    return user_info
  else:
    raise NoUserIdException()


def get_authorization_url(email_address, state, redirect_uri=False):
  """Retrieve the authorization URL.

  Args:
    email_address: User's e-mail address.
    state: State for the authorization URL.
  Returns:
    Authorization URL to redirect the user to.
  """
  flow = flow_from_clientsecrets(CLIENTSECRETS_LOCATION, ' '.join(SCOPES))
  flow.params['access_type'] = 'offline'
  flow.params['approval_prompt'] = 'force'
  flow.params['user_id'] = email_address
  flow.params['state'] = state
  flow.params['response_type'] = "code"
  return flow.step1_get_authorize_url(redirect_uri or REDIRECT_URI)


def get_credentials(authorization_code, state, uri=False):
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
  email_address = ''

  credentials = exchange_code(authorization_code,uri)
  user_info = get_user_info(credentials)
  email_address = user_info.get('email')
  user_id = user_info.get('id')
  if credentials.refresh_token is not None:
    store_credentials(user_id, credentials)
    return credentials
  else:
    credentials = get_stored_credentials(user_id)
    if credentials and credentials.refresh_token is not None:
      return credentials


if __name__ == "__main__":
    url = get_authorization_url("rick@rockerbox.com","hello")
    code = ''
    import ipdb; ipdb.set_trace()

    get_credentials(code,"loggedin")
    print "ASDF"
