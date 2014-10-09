import tornado.web
from lib.helpers import *

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
                
 
