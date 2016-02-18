from __future__ import print_function
import httplib2
import os

from apiclient import discovery
import oauth2client
from oauth2client import client
from oauth2client import tools


SCOPES = 'https://www.googleapis.com/auth/gmail.readonly'
CLIENT_SECRET_FILE = 'secrets.json'
APPLICATION_NAME = 'Gmail API Python Quickstart'

import mock
flags = mock.MagicMock()

flags.logging_level = "ERROR"

def get_credentials():
    """Gets valid user credentials from storage.

    If nothing has been stored, or if the stored credentials are invalid,
    the OAuth2 flow is completed to obtain the new credentials.

    Returns:
        Credentials, the obtained credential.
    """
    home_dir = os.path.expanduser('~')
    credential_dir = os.path.join(home_dir, '.credentials')
    if not os.path.exists(credential_dir):
        os.makedirs(credential_dir)
    credential_path = os.path.join(credential_dir,
                                   'gmail-python-quickstart.json')

    store = oauth2client.file.Storage(credential_path)
    credentials = store.get()
    if not credentials or credentials.invalid:
        flow = client.flow_from_clientsecrets(CLIENT_SECRET_FILE, SCOPES)
        flow.user_agent = APPLICATION_NAME

        credentials = tools.run_flow(flow, store, flags)
        
        print('Storing credentials to ' + credential_path)
    return credentials

def x():
    """Shows basic usage of the Gmail API.

    Creates a Gmail API service object and outputs a list of label names
    of the user's Gmail account.
    """
    credentials = get_credentials()
    http = credentials.authorize(httplib2.Http())
    service = discovery.build('gmail', 'v1', http=http)

    results = service.users().labels().list(userId='me').execute()
    labels = results.get('labels', [])

    if not labels:
        print('No labels found.')
    else:
      print('Labels:')
      for label in labels:
        print(label['name'])
  
def parse_email_addr(email):
    split = email.split("<")
    if len(split) > 1:
        return {"name":split[0].strip(),"email":split[1].replace(">","")}
    return {"email":email}
        
def y(search="yo",ignore="rockerbox"):
    """Shows basic usage of the Gmail API.

    Creates a Gmail API service object and outputs a list of label names
    of the user's Gmail account.
    """
    credentials = get_credentials()
    http = credentials.authorize(httplib2.Http())
    service = discovery.build('gmail', 'v1', http=http)

    results = service.users().messages().list(userId='me',q=search).execute()
    messages = results.get('messages', [])
    all_recipients = []
    for m in messages:
        message = service.users().messages().get(userId='me',id=m.get("id")).execute()
        headers = message.get("payload",{}).get("headers")
        recipients = [ h.get("value") for h in headers if "To" == h.get("name") and ignore not in h.get("value") and "era" not in h.get("value") and "ronjacobson" not in h.get("value")]
        all_recipients += recipients
        
    return [parse_email_addr(r) for r in set(all_recipients)]

def search(row):
    param = "%s %s" % (row.agency,row.brand)
    emails = y(param)
    
    for e in emails:
        e['trello_id'] = row.trello_id
        e['search_param'] = param
    print(emails)
    return emails

if __name__ == '__main__':
    y("journelle")
