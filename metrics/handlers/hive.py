import contextlib

import tornado.web
import ujson
import pandas
import StringIO
import hive_utils
from urlparse import urlparse
from twisted.internet import defer, threads

API_QUERY = "select * from appnexus_reporting.%s where %s "

hive = hive_utils.HiveClient(server="slave4",port="7425")

@contextlib.contextmanager
def openclose(transport):
    if not getattr(transport, 'keep_open', None):
        transport.open()
    yield
    if not getattr(transport, 'keep_open', None):
        transport.close()

def run_hive(q):
    with openclose(hive._HiveClient__transport):
        hive._HiveClient__client.execute('set shark.map.tasks=1; set mapred.reduce.tasks = 1;')

    return list(hive.execute('select * from agg_visible_cached where %s limit 1000000' % q))



def async_run_hive(q):
    d = threads.deferToThread(run_hive,q)
    return d

def try_int(x):
    try:
        return int(x)
    except:
        return 0

class ViewabilityHandler(tornado.web.RequestHandler):
    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive

    @defer.inlineCallbacks
    def get_content(self,q,groups,sort_by,format_type):
        import time
        print "Start hive query: %s" % q
        start = time.time()
        t = yield async_run_hive(q)
        print "Finished hive query in %.2fs" % (time.time() - start)
        u = pandas.DataFrame(t)
        
        u = u.set_index("referrer")
        u = u.applymap(try_int)
        u = u.reset_index()
        u['domain'] = u['referrer'].map(lambda x: urlparse(x).netloc.replace("www.","") if urlparse(x).netloc else x )
        
        v = u.groupby(groups).sum()

        if sort_by:
            v = v.sort_index(by=sort_by, ascending=False)


        if format_type == "csv":
            output = StringIO.StringIO()
            v[v.served > 10][["served","served_visibility","visible"]].to_csv(output)
            self.write(output.getvalue())
            output.close()
        else:
            self.write(v[v.served > 10][["served","served_visibility","visible"]].to_html())

        self.finish()

    @tornado.web.asynchronous
    def get(self):
        member = self.get_argument("member",False)
        groups = self.get_argument("group_by","domain").split(",")
        sort_by = self.get_argument("sort_by",False)
        format_type = self.get_argument("type",False)

        q = "1=1 "
        if member:
            q += "and seller = '%s' " % member
        
        self.get_content(q,groups,sort_by,format_type)

    def post(self):
        print self.request.body
        self.write("hello")

