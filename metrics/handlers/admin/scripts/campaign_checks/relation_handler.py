import tornado.web
import ujson
import pandas
import StringIO

from lib.helpers import *
from relation import CampaignRelation

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
        d = self.db.select_dataframe(API_QUERY % ("view","1=1"))
        d = d.reset_index()
        d = d.rename(columns={"index":"__index__"})
        return d 

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            _json = Convert.df_to_json(data)
            self.render("admin/campaign_checks.html",data=_json) 

        yield default, (data,)

    def get(self,arg=None):

        if arg == "fixtures":
            self.write("fixtures")
        elif arg == "new":
            self.write("new")
        elif arg == "meta":
            self.write("""{
                "groups":["campaign_id"],
                "fields":[],
                "is_wide":true
            }""")
            return 
        elif arg.isnumeric():
            data = self.get_campaign(arg)
            self.get_content(data)
        else:
            data = self.get_all()
            self.get_content(data)
                


class CampaignRelationsHandler(CampaignRelation,tornado.web.RequestHandler):
    
    def post(self,arg=None):
        _json = ujson.loads(self.request.body)
        campaign_id = _json.get("campaign_id",False)
        fixture_id = _json.get("fixture_id",False)
        suite_id = _json.get("suite_id",False)

        if campaign_id:
            if fixture_id:
                self.add_campaign_fixture(campaign_id,fixture_id)
                self.write("success")
            elif suite_id:
                self.add_campaign_suite(campaign_id,suite_id)
                self.write("success") 

    def delete(self,arg=None):
        campaign_id = self.get_argument("campaign_id",False)
        fixture_id = self.get_argument("fixture_id",False)
        suite_id = self.get_argument("suite_id",False) 

        if campaign_id:
            if fixture_id:
                self.delete_campaign_fixture(campaign_id,fixture_id)
                self.write("success")
            elif suite_id:
                self.delete_campaign_suite(campaign_id,suite_id)
                self.write("success")
