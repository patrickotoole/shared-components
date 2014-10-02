import tornado.web
import ujson
import pandas
import StringIO

from lib.helpers import *

API_QUERY = "select * from %s where %s "
INSERT_QUERY = "INSERT INTO campaigntest_campaign_fixtures (%(fields)s) VALUES %(values)s"
DELETE_QUERY = "DELETE FROM campaigntest_campaign_fixtures where %s"
SELECT_QUERY = "SELECT * FROM campaigntest_campaign_fixtures where %s"

CAMPAIGN_Q = "select * from advertiser_campaign where campaign_id = %s"  
FIXTURE_Q = "select * from campaigntest_fixture where id = %s"   
SUITE_Q = "select * from campaigntest_suite where id = %s"    

def isnumeric(fn):
    def check_numeric(self,*args):
        for arg in args:
            if not unicode(arg).isnumeric():
                raise TypeError("arguments must be numeric")
        return fn(self,*args)

    return check_numeric



def exists(query,pos=None,message="Data is missing"):
    def check_exists(fn):
        def check(self,*args):
            _id = args
            if pos is not None:
                _id = args[pos]
            if len(self.db.select_dataframe(query % _id)) == 0:
                raise Exception(message)
            return fn(self,*args)

        return check
    return check_exists

def run_query(fn):
    def run(self,*args):
        result = fn(self,*args)
        print result
        self.db.execute(result)

    return run

class CampaignCheckRelationships(object):
    
    @exists(FIXTURE_Q,1,"Missing Fixture") 
    @exists(CAMPAIGN_Q,0,"Missing Campaign")
    @isnumeric
    @run_query
    def add_campaign_fixture(self,campaign,fixture):
        params = {
            "fields" : "`campaign_id`,`fixture_id`",
            "values" : "(%s, %s)" % (campaign,fixture)
        }
        return INSERT_QUERY % params

    @exists(SUITE_Q,1,"Missing Suite") 
    @exists(CAMPAIGN_Q,0,"Missing Campaign")  
    @isnumeric
    @run_query
    def add_campaign_suite(self,campaign,suite):
        params = {
            "fields" : "`campaign_id`,`suite_id`",
            "values" : "(%s, %s)" % (campaign,suite)
        }
        return INSERT_QUERY % params

    @exists(SELECT_QUERY % "`campaign_id` = %s and `suite_id` = %s ",None,"relationship doesnt exists") 
    @isnumeric
    @run_query
    def delete_campaign_fixture(self,campaign,fixture):
        where = "`campaign_id` = %s and `fixture_id` = %s " % (campaign,fixture)
        return DELETE_QUERY % where
         
    @exists(SELECT_QUERY % "`campaign_id` = %s and `suite_id` = %s ",None,"relationship doesn't exists")
    @isnumeric
    @run_query
    def delete_campaign_suite(self,campaign,suite):
        where = "`campaign_id` = %s and `suite_id` = %s " % (campaign,suite)
        return DELETE_QUERY % where
 
         
        

class CampaignChecksHandler(CampaignCheckRelationships,tornado.web.RequestHandler):
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

        
 
