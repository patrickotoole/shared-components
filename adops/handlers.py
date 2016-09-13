from database import *
from helpers import *
import tornado

class AdopsBaseHandler(tornado.web.RequestHandler):

    def initialize(self,db=None,**kwargs):
        self.db= db

    def get(self):
        the_HTML = get_base_html()
        self.write(the_HTML)

class AdopsHandler(AdopsBaseHandler):

    def get(self, uri):
        try:
            the_HTML = get_html(self.db, uri)
        except:
            the_HTML = get_fail_html()
        self.write(the_HTML)
