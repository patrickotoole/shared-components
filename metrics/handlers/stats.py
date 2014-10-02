import contextlib

import tornado.web
import ujson
import pandas
import StringIO
from urlparse import urlparse
from twisted.internet import defer, threads

API_QUERY = "select * from %s where %s "


@contextlib.contextmanager
def openclose(transport):
    if not getattr(transport, 'keep_open', None):
        transport.open()
    yield
    if not getattr(transport, 'keep_open', None):
        transport.close()

def run_hive(q):
    # mock the function
    return df


def try_int(x):
    try:
        return int(x)
    except:
        return 0

class StatsHandler(tornado.web.RequestHandler):
    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive


    def get(self):
        member = self.get_argument("member",False)
        groups = self.get_argument("group_by","domain").split(",")
        sort_by = self.get_argument("sort_by",False)
        format_type = self.get_argument("type",False)

        q = "1=1 "
        if member:
            q += "and seller = '%s' " % member

        df = run_hive()
        stats = do_stats(df) 

        return stats

    def post(self):
        print self.request.body
        self.write("hello")

