import datetime
import pandas
import tornado.web
import logging

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_deferred
from lib.query.HIVE import AGG_APPROVED_AUCTIONS
SEGMENT_VOLUME = """
SELECT 
    segment, 
    sum(num_imps) as imps
FROM agg_domain_imps 
LATERAL VIEW explode(segments) segTable as segment 
WHERE 
    %(where)s
GROUP BY 
    %(groupby)s
"""

class SegmentReportingHandler(tornado.web.RequestHandler):
    def initialize(self, hive=None):
        self.hive = hive

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            o = Convert.df_to_json(data)
            self.write(o)
            self.finish()

        yield default, (data,)

    @defer.inlineCallbacks
    def get_data(self,q):
        t = yield run_hive_deferred(self.hive,q)
        u = pandas.DataFrame(t)
        self.get_content(u)

    @tornado.web.asynchronous
    def get(self):
        yesterday = (datetime.date.today() - datetime.timedelta(1))
        date = self.get_argument("date",yesterday.strftime("%y-%m-%d"))
        hour = self.get_argument("hour",False)
        groupby = self.get_argument("groupby","segment")
       
        w = "date='%s' " % (date)
        if hour:
            w += " and hour = '%s'" % hour

        params = {
            "groupby": groupby,
            "where" : w
        }
        q = SEGMENT_VOLUME % params
        q = " ".join(q.replace('\n',' ').split())

        self.get_data(q) 
