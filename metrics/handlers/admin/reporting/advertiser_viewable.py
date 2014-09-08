import tornado.web
import ujson
import pandas
import datetime

from twisted.internet import defer 

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred, run_hive_deferred
from lib.query.HIVE import ADVERTISER_VIEWABLE
import lib.query.helpers as query_helpers


class AdvertiserViewableHandler(tornado.web.RequestHandler):

    def initialize(self, db=None, hive=None, **kwargs):
        self.db = db 
        self.hive = hive

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            _json = Convert.df_to_json(data)
            self.render("admin/reporting/advertiser_viewable.html",data=_json)
        
        yield default, (data,)

    @defer.inlineCallbacks
    def get_data(self,q,groupby=False,wide=False):
        try:
            t = yield run_hive_session_deferred(self.hive,["set shark.map.tasks=7", "set mapred.reduce.tasks=0",q])
        except:
            self.finish()

        u = pandas.DataFrame(t)
        u['num_served'] = u.num_served.astype(int)
        u['num_loaded'] = u.num_loaded.astype(int) 
        u['num_visible'] = u.num_visible.astype(int) 

        self.get_content(u) 

    
    @tornado.web.asynchronous
    def get(self):

        date = self.get_argument("date",datetime.datetime.now().strftime("%y-%m-%d"))
        _from = self.get_argument("start_date",False)
        _until = self.get_argument("end_date",False) 

        params = {
            "1":"1"#,
            #"date": date
            #"hour": "00"
            #"date_range": self.get_argument("date_range","yesterday")
        }                                           

        q = ADVERTISER_VIEWABLE % {
            "where": query_helpers.__where_and_eq__(params) + 
                " and date >= '%(date)s' " % {"date":_from}
        }

        data = self.get_data(q)

    
