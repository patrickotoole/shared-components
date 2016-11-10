import ujson
from tornado import web
from adwords import AdWords

class AuthorizeHandler(web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db',None)
        self.adwords = kwargs.get('adwords',None)

    def get(self):
        auth_uri = self.adwords.RB.flow.step1_get_authorize_url()
        self.redirect(auth_uri)
