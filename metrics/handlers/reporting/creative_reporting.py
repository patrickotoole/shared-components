import tornado.web
import ujson
import pandas
import StringIO
import time
from ..base import BaseHandler
from lib.helpers import *

from lib.query.MYSQL import *

class CreativeReportingBase(BaseHandler):

    def initialize(self, db, **kwargs):
        self.db = db 

    def pull_advertiser_creatives(self,advertiser_id,date_min=None,date_max=None):
        params = {
            "advertiser_id": advertiser_id,
            "date_min": date_min,
            "date_max": date_max
        }
        q = CREATIVE_QUERY % params
        df = self.db.select_dataframe(q)
        df['associated_campaigns'] = df['associated_campaigns'].map(lambda x: x.split(" "))
        df['url'] = df.creative_id.map(lambda x: "http://ib.adnxs.com/cr?id=%s" % x)

        return df

class CreativeReportingHandler(CreativeReportingBase):

    def initialize(self, db, **kwargs):
        self.db = db 

    @tornado.web.authenticated
    @decorators.formattable
    def get(self):

        advertiser = self.current_advertiser
        user = self.current_user
        _format  = self.get_argument("format",False)
        _min = self.get_argument("start_date",0)
        _max = self.get_argument("end_date",int(time.time()))

        if _format:
            data = self.pull_advertiser_creatives(advertiser,_min,_max)
        else:
            data =""

        def default(self,data):
            # dont do anything with the data
            # wait for async call with the format
            self.render("reporting/_creative_reporting.html", advertiser_id=advertiser, user_id=user)


        yield default, (data,)
 
