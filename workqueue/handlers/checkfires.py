import tornado
import ujson
import tornado.web
import pandas
import numpy
import datetime


FIRES = "select pixel_source_name as advertiser, pixel_fires, date from advertiser_pixel_fires where date > '%s'"

class CheckFiresHandler(tornado.web.RequestHandler):
    
    def initialize(self, **kwargs):
        self.crushercache = kwargs.get('crushercache',False)
        self.db = kwargs.get('db', False)

    def get(self):
        df = self.crushercache.select_dataframe(FIRES % (datetime.datetime.now() - datetime.timedelta(days=7)).strftime("%Y-%m-%d"))

        ndict = df.set_index(["advertiser","date"])['pixel_fires'].unstack(1).fillna(0).reset_index(['advertiser'])
        ndict.columns = [str(x) for x in ndict.columns]
        colheaders = ndict.columns.tolist()
        ndict = ndict.to_dict('records')
        colheaders.sort(reverse=True)
        heads = [{"key":x,"value":x} for x in colheaders]

        data ={'values':ndict, 'headers':heads}

        self.render("checks.html", data=data, paths="")


