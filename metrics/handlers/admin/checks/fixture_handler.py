import tornado.web
import ujson
from lib.helpers import *

API_QUERY = "SELECT * FROM campaigntest_fixture_view WHERE %s"
UPDATES = {
    "assertion_name":"SELECT id from campaigntest_assertion_type where name = '%(assertion_name)s'",
    "profilekey_name":"SELECT id from campaigntest_profilekey where name = '%(profilekey_name)s'",
    "external_advertiser_id":"SELECT id from campagintest_fixture_expected where external_advertiser_id = %(external_advertiser_id)s",
    "fixture_name":"SELECT * from campaigntest_fixture where name = '%(fixture_name)s'"
}
UPDATES_IDS = {
    "assertion_name":"assertion_type_id",
    "profilekey_name":"profilekey_id",
    "external_advertiser_id":"external_advertiser_id",
    "fixture_id":"fixture_id"
}
UPDATE = "UPDATE campaigntest_fixture_expected %s where id = %s"

class FixtureHandler(tornado.web.RequestHandler):

    def initialize(self, db):
        self.db = db 

    def process_updates(self,updates,obj):

        def sel(x):
            df = self.db.select_dataframe(x)
            return df.ix[0,'id']

        _updates = []

        for up in updates:
            q = UPDATES.get(up,False)
            i = UPDATES_IDS[up]
            if q:
                _updates += ["set %s = %s" % (i,sel(q % obj))]

        return UPDATE % (", ".join(_updates),obj['id'])
     

    def update(self,obj):
        _id = obj['id']

        orig = self.db.select_dataframe("SELECT * from campaigntest_fixture_view where id = %s" % _id)
        new = pandas.DataFrame([obj])

        try:
            pandas.util.testing.assert_frame_equal(orig,new[orig.columns])
        except:
            updates = orig.columns[(orig == new[orig.columns]).sum() == 0]
            q = self.process_updates(updates,obj)
            self.db.execute(q)
        


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

        self.get_all()

    def put(self,_id):
        obj = ujson.loads(self.request.body)
        self.update(obj)


               
 
 
