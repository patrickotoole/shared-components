import tornado
import ujson
import tornado.web

ADVERTISER_QUERY ="select a.pixel_source_name, a.action_name, a.action_id from  action a join advertiser b on a.pixel_source_name = b.pixel_source_name where b.crusher=1"
#CACHEQUERY = "select currenttime from generic_function_cache where advertiser = '%s' and udf='domains_full_time_minute' and action_id='%s'"
CACHEQUERY = "select count(*) from generic_function_cache where advertiser = '%s' and udf='domains_full_time_minute' and action_id='%s'"

class ChecksHandler(tornado.web.RequestHandler):
    
    def initialize(self, **kwargs):
        self.crushercache = kwargs.get('crushercache',False)
        self.db = kwargs.get('db', False)

    def get(self):
        advertisers_segments = self.db.select_dataframe(ADVERTISER_QUERY)
        data = {"values":[]}
        for x in advertisers_segments.iterrows():
            data2 = self.crushercache.select_dataframe(CACHEQUERY % (x[1]['pixel_source_name'], x[1]['action_id']))
            data['values'].append({"Advertiser":x[1]['pixel_source_name'], "Segment Name": x[1]["action_name"], "Count of Dashboard Agg":data2['count(*)'][0]}) 
        #final_data = data2.to_dict("records")
        self.render("checks.html", data=data, paths="")
