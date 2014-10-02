import tornado.web
import ujson
import pandas
import StringIO

from twisted.internet import defer

from lib.helpers import * 

API_QUERY = "select * from advertiser where %s "
QUERY = "UPDATE advertiser_segment set segment_implemented = '%(segment_implemented)s' where id = %(id)s"

INCLUDES = {
    "pixels":"advertiser_pixel",
    "campaigns": "advertiser_campaign",
    "segments": "advertiser_segment",
    "domain_lists": "advertiser_domain_list"
}

class SegmentHandler(tornado.web.RequestHandler):
    def initialize(self, db, api):
        self.db = db 
        self.api = api

    @decorators.formattable
    def get_content(self,data):
        
        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("../templates/admin/segment/index.html",data=o)

        yield default, (data,)

    def get_data(self,advertiser_id=False):

        where = "deleted = 0 "
        if advertiser_id:
            where += (" and a.external_advertiser_id = %s" % advertiser_id)
        
        df = self.db.select_dataframe(API_QUERY % where).set_index("external_advertiser_id") 
        includes = self.get_argument("include","segments")

        if includes:
            include_list = includes.split(",")
            for include in include_list:
                included = INCLUDES.get(include,False)
                idf = self.db.select_dataframe("select * from %s where %s" % (included,where))
                if len(idf) > 0:
                    df[include] = idf.groupby("external_advertiser_id").apply(Convert.df_to_values)

        self.get_content(df.reset_index())
         

    @tornado.web.asynchronous
    def get(self,advertiser_id=False):
        self.get_data(advertiser_id)

    def put(self,advertiser_id=False):
        json_body = ujson.loads(self.request.body)
        update = QUERY % json_body
        self.db.execute(update)
        self.db.commit()
        self.write(ujson.dumps(json_body))

 
