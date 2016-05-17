import tornado.web
from link import lnk
from lib.query.MYSQL import *
import pandas
from lib.helpers import decorators
import ujson
from lib.helpers import Convert
#from ..lib.hive import Hive

class BaseHandler(tornado.web.RequestHandler):

    def get_current_user(self):
        return self.get_secure_cookie("user")

    def get_current_advertiser(self):
        advertiser = self.get_secure_cookie("advertiser")
        if advertiser == "0": self.redirect("/beta")

        return advertiser
    
    def summarize(self,df):
        sum_obj = {}
        for i in df.columns:
            if type(df[i][0]) == unicode or type(df[i][0]) == str:
                sum_obj[i] = df[i].count()
            else:
                try:
                    sum_obj[i] = df[i].sum()
                except:
                    sum_obj[i] = str(type(df[i]))
        return sum_obj

    def format_response(self,data, summary, details):
        resp_obj = {"response":data, "summary":summary, "api_details":details}
        return resp_obj

    def setDetails(self,details):
        import datetime
        if details:
            details['time'] = datetime.datetime.now() - self.time[str(self.__hash__)]
            details['time'] = details['time'].total_seconds()
            details['remote_ip'] = self.request.remote_ip
            self.time.pop(str(self.__hash__),None)
        else:
            details = {}
            details['time'] = datetime.datetime.now() - self.time[str(self.__hash__)]
            details['time'] = details['time'].total_seconds()
            details['remote_ip'] = self.request.remote_ip
            self.time.pop(str(self.__hash__),None)
        return details

    @decorators.formattable
    def get_content(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.write(df)
            self.finish()
        if type(data) == type(Exception()):
            self.set_status(400)
            self.write(ujson.dumps({"error":str(data)}))
            self.finish()
        else:
            yield default, (data,)

    @decorators.formattable
    def get_content_v1(self, data):
        def default(self, data):
            df = Convert.df_to_json(data)
            self.write(df)
            self.finish()
        if type(data) == type(Exception()):
            self.set_status(400)
            self.write(ujson.dumps({"error":str(data)}))
            self.finish()
        elif type(data) == dict:
            self.write(ujson.dumps(data))
            self.finish()
        else:
            yield default, (data,)


    @decorators.formattable
    def get_content_v2(self, data, summary=False, details=False):
        default_details = self.setDetails(details)
        def default(self, data):
            df = Convert.df_to_json(data)
            self.write(df)
            self.finish()

        if type(data) == type(Exception()):
            self.set_status(400)
            self.write(ujson.dumps({"error":str(data)}))
            self.finish()
        elif summary:
            df = Convert.df_to_values(data)
            _resp = self.format_response(df, summary, default_details)
            self.write(ujson.dumps(_resp))
            self.finish()
        elif not summary and type(data) == dict:
            _resp = self.format_response(data, {}, details)
            self.write(ujson.dumps(_resp))
            self.finish()
        else:
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
