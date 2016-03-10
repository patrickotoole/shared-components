import tornado.web
from link import lnk
from lib.query.MYSQL import *
from lib.helpers import decorators
#from ..lib.hive import Hive

class BaseHandler(tornado.web.RequestHandler):

    def get_current_user(self):
        return self.get_secure_cookie("user")

    def get_current_advertiser(self):
        advertiser = self.get_secure_cookie("advertiser")
        if advertiser == "0": self.redirect("/beta")

        return advertiser

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.render("analysis/visit_urls.html", data=df)
        yield default, (data,)

    @property
    def current_advertiser(self):
        if not hasattr(self, "_current_advertiser"):
            self._current_advertiser = self.get_current_advertiser()
        return self._current_advertiser

    @property
    def current_advertiser_name(self):
        q = ADVERTISER_ID_TO_NAME % self.current_advertiser
        df = self.db.select_dataframe(q)

        if len(df) > 0:            
            return df.name[0]
        else:
            return None

    @property
    def authorized_advertisers(self):
        q = PERMISSIONS_QUERY % self.get_secure_cookie("user")
        df = self.db.select_dataframe(q)

        if len(df) > 0:            
            return df.pixel_source_name.tolist()
        else:
            return [self.current_advertiser_name]

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
