import tornado.web
import ujson
import pandas

from lib.helpers import *
from relation import Relation

CAMPAIGN_QUERY = "select * from advertiser_campaign where %(where)s"
ADVERTISER_QUERY = "select * from advertiser where %(where)s"
CAMPAIGN_VIEW_QUERY = "select * from campaigntest_view where %(where)s"


def fill_isnan(x):
    try:
      if pandas.np.isnan(x):
        return []
    except:
        return x


class CampaignRelationsHandler(Relation,tornado.web.RequestHandler):

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
        mask = (df['suite_id'] != 0)

        campaigns['suites']   = df[mask].groupby("campaign_id").apply(Convert.df_to_values)
        campaigns['fixtures'] = df[mask].groupby("campaign_id").apply(Convert.df_to_values)
        campaigns['suites']   = campaigns['suites'].map(fill_isnan)
        campaigns['fixtures'] = campaigns['fixtures'].map(fill_isnan) 

        return campaigns

    def get_all(self):
        where = "1=1"

        advertiser = self.db.select_dataframe(ADVERTISER_QUERY % {"where":where}).set_index("external_advertiser_id")
        campaigns = self.db.select_dataframe(CAMPAIGN_QUERY % {"where":where}).set_index("campaign_id")
        df = self.db.select_dataframe(CAMPAIGN_VIEW_QUERY % {"where":where})
        campaigns = self.transform(campaigns,df)
        
        advertiser['campaign_relations'] = campaigns.groupby("external_advertiser_id").apply(Convert.df_to_values)

        self.get_content(advertiser)

    def get_campaign(self,_id):
        CAMPAIGN_QUERY = "select * from advertiser_campaign where campaign_id = %s"
        ADVERTISER_QUERY = "select * from advertiser where external_advertiser_id = %s"
        CAMPAIGN_VIEW_QUERY = "select * from campaigntest_view where campaign_id = %s"
        
        c_df = self.db.select_dataframe(CAMPAIGN_QUERY % _id)
        campaigns = c_df.set_index("campaign_id") 

        a_id = campaigns.external_advertiser_id.iloc[0]
        a_df = self.db.select_dataframe(ADVERTISER_QUERY % a_id)
        advertiser = a_df.set_index("external_advertiser_id")

        df = self.db.select_dataframe(CAMPAIGN_VIEW_QUERY % _id)
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

        elif suite_id:
            if fixture_id:
                self.add_suite_fixture(suite_id,fixture_id)

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
        elif suite_id:
            if fixture_id:
                self.delete_suite_fixture(suite_id,fixture_id)



