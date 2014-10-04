import tornado.web
import ujson
import pandas

from lib.helpers import *
from relation import CampaignRelation

def fill_isnan(x):
    try:
      if pandas.np.isnan(x):
        return []
    except:
        return x

class CampaignRelationsHandler(CampaignRelation,tornado.web.RequestHandler):

    def initialize(self, db):
        self.db = db 

    @decorators.formattable 
    def get_content(self,data):
        
        def default(self,data):
            _json = Convert.df_to_json(data)
            self.render("admin/campaign_checks.html",data=_json)  

        yield default, (data,)

    @classmethod
    def transform(self,campaigns,df):
        campaigns['suites'] = df[df['suite_id'] != 0].groupby("campaign_id").apply(Convert.df_to_values)
        campaigns['fixtures'] = df[df['suite_id'] == 0].groupby("campaign_id").apply(Convert.df_to_values)
        campaigns['suites'] = campaigns['suites'].map(fill_isnan)
        campaigns['fixtures'] = campaigns['fixtures'].map(fill_isnan) 
        return campaigns

    def get_all(self):
        advertiser = self.db.select_dataframe("select * from advertiser").set_index("external_advertiser_id")
        campaigns = self.db.select_dataframe("select * from advertiser_campaign").set_index("campaign_id")
        df = self.db.select_dataframe("select * from campaigntest_view" )
        campaigns = self.transform(campaigns,df)
        
        advertiser['campaign_relations'] = campaigns.groupby("external_advertiser_id").apply(Convert.df_to_values)

        self.get_content(advertiser)

    def get_campaign(self,_id):
        
        campaigns = self.db.select_dataframe("select * from advertiser_campaign").set_index("campaign_id") 
        a_id = campaigns.external_advertiser_id[0]
        advertiser = self.db.select_dataframe("select * from advertiser where external_advertiser_id = %s" % a_id).set_index("advertiser") 
        df = self.db.select_dataframe("select * from campaigntest_view where campaign_id = %s" % _id)
        campaigns = self.transform(campaigns,df) 

        advertiser['campaign_relations'] = campaigns.groupby("external_advertiser_id").apply(Convert.df_to_values) 

        self.get_content(advertiser)

    def get(self,arg=None):
        if arg:
            self.get_campaign(arg)
        else:
            self.get_all()
    
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
