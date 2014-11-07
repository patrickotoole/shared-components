import tornado.web
import ujson
from lib.helpers import *

API_QUERY = """
SELECT 
    s.fixture_id as fixture_id, 
    s.suite_id as suite_id, 
    f.external_advertiser_id, 
    f.fixture_name, 
    f.profilekey_name,
    f.assertion_name 
FROM campaigntest_suite_fixtures s 
JOIN campaigntest_fixture_view f 
ON s.fixture_id = f.fixture_id 
WHERE %s
"""
SUITE_QUERY = "SELECT * FROM campaigntest_suite where %s"
FIXTURE_QUERY = "SELECT * FROM campaigntest_fixture_view where %s"

COLUMNS = ["fixture_id","suite_id","external_advertiser_id","fixture_name","profilekey_name","asertion_name"]

def fill_isnan(x):
    try:
      if pandas.np.isnan(x):
        return []
    except:
        return x
 

class SuiteHandler(tornado.web.RequestHandler):

    def initialize(self, db):
        self.db = db 

    def get_all(self,arg=None):
        aw, sw = "1=1", "1=1"
        if arg is not None:
            sw = "id = %s" % arg
            aw = "suite_id = %s" % arg

        _o = self.db.select_dataframe(SUITE_QUERY % sw).set_index("id")
        _d = self.db.select_dataframe(API_QUERY % aw)

        # Need to make this unique based on fixture_id
        _d['suite_id'] = _d.suite_id.map(int)
        _g = _d.fillna(0).groupby(COLUMNS[:-1])[["assertion_name"]].apply(Convert.df_to_values)
        _g = _g.reset_index().rename(columns={0:"assertions"})


        _o['fixtures'] = _g.groupby("suite_id").apply(Convert.df_to_values).map(fill_isnan)

        self.get_content(_o.reset_index())

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            _json = Convert.df_to_json(data)
            self.render("admin/checks/suites.html",data=_json) 

        yield default, (data,)

    def update(self,obj):
        UPDATE = "UPDATE campaigntest_suite set name = '%(name)s' where id = %(id)s"
        self.db.execute(UPDATE % obj)


    def get(self,arg=None):

        self.get_all(arg)

    def put(self,_id):
        obj = ujson.loads(self.request.body)
        self.update(obj)

    def post(self):
        obj = ujson.loads(self.request.body)
        print obj


               
 
 
