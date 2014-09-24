import datetime
import pandas
import tornado.web
import logging

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred
from lib.query.HIVE import AGG_APPROVED_AUCTIONS
SEGMENT_VOLUME = """
SELECT 
    segment, 
    sum(num_imps) as imps, 
    sum(num_considered) as considered_imps, 
    sum(num_approved) as approved_imps 
FROM (
    SELECT 
        segments, 
        num_imps, 
        CASE WHEN array_contains(segments,'1448516') THEN num_imps ELSE CAST(0 AS BIGINT) END as num_considered, 
        CASE WHEN array_contains(segments,'1436688') THEN num_imps ELSE CAST(0 AS BIGINT) END as num_approved 
    FROM agg_domain_imps 
    WHERE
        %(where)s
) a 
LATERAL VIEW explode(segments) segTable as segment 
GROUP BY 
    %(groupby)s
"""

SEGMENT_VOLUME = """
SELECT 
    segment,
    sum(imps) as imps,
    sum(considered_imps) as considered_imps,
    sum(approved_imps) as approved_imps
FROM
    agg_segments_scrubbed
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
        query_list = [
            "set shark.map.tasks=44", 
            "set mapred.reduce.tasks=0",
            q
        ]

        t = yield run_hive_session_deferred(self.hive,query_list) 
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
