import tornado
import ujson
import tornado.web
import pandas
import numpy
import datetime

ADVERTISER_QUERY ="select a.pixel_source_name, a.action_name, a.action_id from  action a join advertiser b on a.pixel_source_name = b.pixel_source_name where b.crusher=1"
CACHEQUERY = "select date from generic_function_cache where advertiser = '%s' and udf='domains_full_time_minute' and action_id='%s'"

QUERY = "select distinct advertiser, action_id, date from generic_function_cache where udf='domains_full_time_minute' and date > '%s'"
QUERY2 = "select distinct action_name, filter_id as action_id from advertiser_caching_segment"

class ChecksHandler(tornado.web.RequestHandler):
    
    def initialize(self, **kwargs):
        self.crushercache = kwargs.get('crushercache',False)
        self.db = kwargs.get('db', False)

    def get(self):
        advertisers_segments = self.db.select_dataframe(ADVERTISER_QUERY)
        df_adv = self.db.select_dataframe(QUERY2)
        df = self.crushercache.select_dataframe(QUERY % (datetime.datetime.now() - datetime.timedelta(days=30)).strftime("%Y-%m-%d"))
        #df['date'] = df.apply(lambda x : str(x))
        df['filled'] = 1
        df = df.merge(df_adv,on="action_id")
        ndict = df.set_index(["advertiser","action_name","date"])['filled'].unstack(2).fillna(0).reset_index(['advertiser','action_name'])
        ndict.columns = [str(x) for x in ndict.columns]
        colheaders = ndict.columns.tolist()
        ndict = ndict.to_dict('records')
        colheaders.sort(reverse=True)
        heads = [{"key":x,"value":x} for x in colheaders]
        
        data ={'values':ndict, 'headers':heads}
        self.render("checks.html", data=data, paths="")


