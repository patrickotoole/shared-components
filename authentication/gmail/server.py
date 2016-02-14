import tornado.ioloop
from tornado import httpserver
from tornado import web

import oauth2client
from apiclient import discovery
import httplib2
import json
import logging
import os

import gmail_auth

def parse_email_addr(email):
    split = email.split("<")
    if len(split) > 1:
        return {"name":split[0].strip(),"email":split[1].replace(">","")}
    return {"email":email}

class IndexHandler(web.RequestHandler):

    def get(self):
        refresh = self.get_argument("refresh",False)
        creds = self.get_secure_cookie("gmail")

        logging.info(self.request)
        logging.info(self.request.host)
        logging.info(self.request.headers)
        
        if not refresh and creds:
            
            creds = oauth2client.client.OAuth2Credentials.new_from_json(creds)
            info = gmail_auth.get_user_info(creds)
            self.write(json.dumps(info))
            self.finish()
            return

        host = self.request.headers.get('X-Real-Host',self.request.host)
        uri = self.request.headers.get('X-Real-Uri',self.request.uri)

        if ":" in host:
            redirect = "urn:ietf:wg:oauth:2.0:oob"
            redirect = "http://localhost" + uri + "callback"
        else:
            redirect = "http://" + host + uri + "/callback"

        url = gmail_auth.get_authorization_url("","hello",redirect)
        self.redirect(url)

class CallbackHandler(web.RequestHandler):

    def get(self):
        creds = self.get_secure_cookie("gmail")
        if creds:
            print creds
            creds = oauth2client.client.OAuth2Credentials.new_from_json(creds)
        else:
         
            code = self.get_argument("code","")
            logging.info(code)
            creds = gmail_auth.get_credentials(code,"logged_in","http://portal.getrockerbox.com/gmail/callback")
            json_creds = creds.to_json()

            self.set_secure_cookie("gmail",json_creds)

        info = gmail_auth.get_user_info(creds)
        self.write(json.dumps(info))
        self.finish()

class SearchHandler(web.RequestHandler):

    def search(self,search="yo",ignore="rockerbox"):
        creds = self.get_secure_cookie("gmail")
        credentials = oauth2client.client.OAuth2Credentials.new_from_json(creds)

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


    def get(self):

        q = self.get_argument("q","")
        creds = self.get_secure_cookie("gmail")

        info = self.search(q)

        for i in info:
            i['search'] = q
            i['from'] = json.loads(creds)['id_token']['email']

        self.write(json.dumps(info))
        self.finish()



class WebApp(web.Application):

    def __init__(self):
        handlers = [
            (r"/search", SearchHandler),
            (r"/callback", CallbackHandler),
            (r"/", IndexHandler),
        ]

        settings = dict(
            static_path='static',
            cookie_secret='rickotoole',
            debug=True
        )

        super(WebApp, self).__init__(handlers, **settings)

def main():
    
    logging.basicConfig(level=logging.INFO)
    app = WebApp()
    server = httpserver.HTTPServer(app)
    server.listen(9001, '0.0.0.0')
    logging.info("Serving at http://0.0.0.0:8888")
    try:
        tornado.ioloop.IOLoop.instance().start()
    except KeyboardInterrupt:
        logging.info("Interrupted...")
    finally:
        pass


if __name__ == '__main__':
    main()

