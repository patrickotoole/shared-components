import tornado.web
import ujson
from lib.helpers import *

API_QUERY = "select s.suite_id as id, f.external_advertiser_id, f.fixture_name, f.profilekey_name, f.assertion_name from campaigntest_suite_fixtures s join campaigntest_fixture_view f on s.fixture_id = f.fixture_id where %s"
SUITE_QUERY = "select * from campaigntest_suite where %s"
FIXTURE_QUERY = "SELECT * FROM campaigntest_fixture_view where %s"

def fill_isnan(x):
    try:
      if pandas.np.isnan(x):
        return []
    except:
        return x
 

class SuiteHandler(tornado.web.RequestHandler):

    def initialize(self, db):
        self.db = db 

    def get_all(self):
        print API_QUERY % "1=1"
        _o = self.db.select_dataframe(SUITE_QUERY % "1=1").set_index("id")
        _d = self.db.select_dataframe(API_QUERY % "1=1")
        _d['id'] = _d.id.map(int)
        _g = _d.groupby("id").apply(Convert.df_to_values)

        _o['fixtures'] = _g
        _o['fixtures'] = _o['fixtures'].map(fill_isnan)

        self.get_content(_o.reset_index())

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            _json = Convert.df_to_json(data)
            self.render("admin/suites.html",data=_json) 

        yield default, (data,)

    def get(self,arg=None):

        self.get_all()

    def put(self,_id):
        obj = ujson.loads(self.request.body)
        self.update(obj)


               
 
 
