import tornado.web
from link import lnk
#from ..lib.hive import Hive



class BaseHandler(tornado.web.RequestHandler):

    def get_current_user(self):
        return self.get_secure_cookie("user")

    def initialize(self):
        #self.db = lnk.dbs.mysql
        #self.api = lnk.api.console 
        #self.hive = Hive().hive
        pass

    def db_execute(self,*args,**kwargs):
        return self.db.select(*args,**kwargs).fetchall()

    def get(self):
        self.write("hello")
        self.finish()
