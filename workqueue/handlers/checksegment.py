import tornado
import ujson
import tornado.web
import pandas
import numpy
import datetime


SEGMENT = "select pixel_source_name as advertiser, pixel_fires, filter_id, date from advertiser_segment_check group by advertiser, filter_id, date having date > '%s'"
QUERY = "select distinct action_name, filter_id from advertiser_caching_segment"

class CheckSegmentHandler(tornado.web.RequestHandler):
    
    def initialize(self, **kwargs):
        self.crushercache = kwargs.get('crushercache',False)
        self.db = kwargs.get('db', False)

    def get(self):
        df = self.crushercache.select_dataframe(SEGMENT % (datetime.datetime.now() - datetime.timedelta(days=7)).strftime("%Y-%m-%d"))
        df_adv = self.db.select_dataframe(QUERY)

        df = df.merge(df_adv,on="filter_id")
        ndict = df.set_index(["advertiser","action_name","date"])['pixel_fires'].unstack(2).fillna(0).reset_index(['advertiser','action_name'])
        ndict.columns = [str(x) for x in ndict.columns]
        colheaders = ndict.columns.tolist()
        ndict = ndict.to_dict('records')
        colheaders.sort(reverse=True)
        heads = [{"key":x,"value":x} for x in colheaders]

        data ={'values':ndict, 'headers':heads}
        self.render("checks.html", data=data, paths="")


