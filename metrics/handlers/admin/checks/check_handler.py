import tornado.web
import ujson
from lib.helpers import *

API_QUERY = "SELECT * FROM campaigntest_fixture_view WHERE %s" 

class CampaignChecksHandler(tornado.web.RequestHandler):

    def initialize(self, db):
        self.db = db 

    def get_fixtures(self):
        pass

    def get_campaign(self,_id):
        where = "campaign_id = %s" % _id

        API_QUERY % ("view",where)
        return self.db.select_dataframe(API_QUERY % ("view",where)) 

    def get_all(self):
        d = self.db.select_dataframe(API_QUERY % "1=1")
        self.get_content(d)

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            _json = Convert.df_to_json(data)
            self.render("admin/campaign_checks.html",data=_json) 

        yield default, (data,)

    def get(self,arg=None):

        if arg == "fixtures":
            self.get_all()
        if arg == "suites":
            self.write("suites")
        elif arg == "new":
            self.write("new")

    def put(self,_id):
        obj = ujson.loads(self.request.body)
        self.update(obj)


               
 
