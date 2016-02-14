from apiclient import discovery
import oauth2client
import httplib2
import logging
import pandas

def parse_email_addr(email):
    
    split = email.split("<")
    if len(split) > 1:
        return {"name":split[0].strip(),"email":split[1].replace(">","")}
    return {"email":email}

def strip_commas(string):
    import re
    return re.sub(r',(?=[^"]*"(?:[^"]*"[^"]*")*[^"]*$)', "|", string)

def search(creds,search="yo",ignore="rockerbox"):

    credentials = oauth2client.client.OAuth2Credentials.new_from_json(creds)

    http = credentials.authorize(httplib2.Http())
    service = discovery.build('gmail', 'v1', http=http)

    results = service.users().messages().list(userId='me',q=search).execute()
    messages = results.get('messages', [])
    all_recipients = []
    for m in messages:
        message = service.users().messages().get(userId='me',id=m.get("id")).execute()
        headers = message.get("payload",{}).get("headers")
        recipients = [h.get("value") for h in headers
                          if  "To" == h.get("name") 
                          and ignore not in h.get("value") 
                          and "era" not in h.get("value") 
                          and "ronjacobson" not in h.get("value")
                     ]
        
        recipient_list = map(lambda x: strip_commas(x).split(","),recipients)
        rec = [ r for l in recipient_list for r in l]
        
        all_recipients += rec

    return [parse_email_addr(r) for r in set(all_recipients)]


def get_creds(db,user=False):
    
    USER = user or "james"
    james = db.select_dataframe("select * from prospect_user where name = '%s'" % USER)
    return james.ix[0].gmail_auth

def run_user_search(db,q,user="james",trello_id=1):
    import ujson
    creds = get_creds(db,user)
    js = ujson.loads(creds)

    info = search(creds,q)
    
    for i in info:
        i['search'] = q
        i['from'] = js['id_token']['email']
        i['trello_id'] = trello_id
    
    return info

def get_contacts_from_cards(db,user="james",limit=10):
    
    from lib.pandas_sql import s
    df = db.select_dataframe("select * from prospect")
    
    df = df.ix[:limit]
    for i,row in df.iterrows():
        
        q = "%s %s" % (row.agency, row.brand)
        logging.info("running %s for %s" % (q,user))

        results = run_user_search(db,q,user,row.trello_id)
        logging.info("%s results of %s" % (len(results),q))
        
        if len(results) > 0:
        
            contacts = pandas.DataFrame(results).fillna("")
            sql_query = s._write_mysql
            sql_query(contacts, "prospect_contact", list(contacts.columns), lnk.dbs.rockerbox, ["trello_id","email"])

if __name__ == "__main__":

    ## INIT
    logging.basicConfig(level=logging.INFO, format='%(asctime)s:%(levelname)s - %(message)s')
    logger = logging.getLogger()

    logging.info("Initializing...")

    from link import lnk
    rockerbox_db = lnk.dbs.rockerbox
    logging.info("Initialized.")

    logging.info("Pulling...")
    get_contacts_from_cards(rockerbox_db,"ron",2000)
    get_contacts_from_cards(rockerbox_db,"james",2000)
    logging.info("Pulled.")
