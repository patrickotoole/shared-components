import tornado.web
import ujson
import pandas
import StringIO
from lib.helpers import *

from lib.query.MYSQL import ADMIN_LOGINS
import lib.query.helpers as query_helpers

class LoginsBase(tornado.web.RequestHandler):
    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive

class LoginsHandler(LoginsBase):
    '''Handler for viewing admin logins'''

    @decorators.formattable
    def get(self, args=None):
        requests = self.db.select_dataframe(ADMIN_LOGINS)
                
        if not self.get_argument("format", False):
            requests = requests.to_html(classes=["dataframe"])

        def default(self, requests):
            self.render( "admin/logins.html", data = requests)

        yield default, (requests,)
