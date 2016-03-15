import tornado.ioloop
from tornado import httpserver
from tornado import web

import oauth2client
import json
import logging
import os

import linkedin_auth

class IndexHandler(web.RequestHandler):

    def get(self):
        refresh = self.get_argument("refresh",False)
        creds = self.get_secure_cookie("linkedin")
        if not refresh and creds:
            
            creds = oauth2client.client.OAuth2Credentials.new_from_json(creds)
            info = linkedin_auth.get_user_info(creds)
            self.write(json.dumps(info))
            self.finish()
            return

        if ":" in self.request.host:
            redirect = "http://localhost"
        else:
            redirect = "http://" + self.request.host + "/callback"

        url = linkedin_auth.get_authorization_url("","hello",redirect)
        self.redirect(url)

class CallbackHandler(web.RequestHandler):

    def get(self):
        creds = self.get_secure_cookie("linkedin")
        if creds:
            creds = oauth2client.client.OAuth2Credentials.new_from_json(creds)
        else:
         
            code = self.get_argument("code","")
            creds = linkedin_auth.get_credentials(code,"logged_in")
            json_creds = creds.to_json()

            self.set_secure_cookie("linkedin",json_creds)

        info = linkedin_auth.get_user_info(creds)
        self.write(json.dumps(info))
        self.finish()

class WebApp(web.Application):

    def __init__(self):
        handlers = [
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
