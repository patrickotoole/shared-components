import contextlib
import datetime

import tornado.web
import ujson
import pandas
import StringIO
import hive_utils
import tornado.template as template
import time

from urlparse import urlparse
from twisted.internet import defer, threads
#from lib.hive import Hive
from lib.helpers import *

API_QUERY = "select * from appnexus_reporting.%s where %s "

#hive = None#hive_utils.HiveClient(server="slave4",port="7425")
#hive = Hive().hive

@contextlib.contextmanager
def openclose(transport):
    if not getattr(transport, 'keep_open', None):
        transport.open()
    yield
    if not getattr(transport, 'keep_open', None):
        transport.close()

def time_log(fn):

    def wrap(*args,**kwargs):
        print "Start %s: %s" % (fn.__name__,str(args))
        start = time.time()
        _return = fn(*args,**kwargs)
        print "Finished %s in %.2fs" % (fn.__name__,(time.time() - start))
        return _return

    return wrap

@time_log
def run_hive(q):
    with openclose(hive._HiveClient__transport):
        hive._HiveClient__client.execute('set shark.map.tasks=8; set mapred.reduce.tasks = 8;')

    return list(hive.execute('select * from agg_approved_lists where %s ' % q))


def async_run_hive(q):
    d = threads.deferToThread(run_hive,q)
    return d

def try_int(x):
    try:
        return int(x)
    except:
        return 0

class TargetListHandler(tornado.web.RequestHandler):
    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive

    def old_get_content(self,q):
        t = yield async_run_hive(q)
        u = pandas.DataFrame(t)
        groups = [i for i in u.columns if i in ["date","hour","minute"]]
        if groups:
            g = u.groupby(groups)[[c for c in u.columns if c not in groups]]
            o = Convert.grouped_df_to_json(g)
        else:
            o = "{}"
        self.render("../templates/_target_reporting.html",stuff=o)
        return

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("../templates/_target_reporting.html",stuff=o)

        yield default, (data,)
        

    @defer.inlineCallbacks
    def get_data(self,q):
        t = yield async_run_hive(q)
        u = pandas.DataFrame(t)
        self.get_content(u)

    @tornado.web.asynchronous
    def get(self):
        domain_list = self.get_argument("list","")
        date = self.get_argument("date",datetime.datetime.now().strftime("%y-%m-%d"))
        hour = self.get_argument("hour",False)
       
        q = "date='%s' and type like '%%%s%%' " % (date,domain_list)
        if hour:
            q += " and hour = '%s'" % hour
        
        self.get_data(q)

    def post(self):
        print self.request.body
        self.write("hello")

