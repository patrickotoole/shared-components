import tornado.web
import ujson
from lib.helpers import Convert

GET = """
SELECT * 
FROM rockerbox.opt_campaigns
WHERE {}
"""

INSERT = """
INSERT INTO rockerbox.opt_campaigns
    (script_name, campaign_id) 
VALUES 
    ("%(script_name)s", %(campaign_id)s)
"""

DELETE = """
DELETE FROM rockerbox.opt_rules
WHERE script_name = {} AND campaign_id = {}
"""

class OptCampaignsHandler(tornado.web.RequestHandler):

    def initialize(self, reporting_db=None, api=None, db=None):
        self.db = reporting_db 
        self.api = api

        self.required_cols = [
            "script_name",
            "campaign_id"
            ]

    def get_all(self):
        where = "1=1"
        return self.db.select_dataframe(GET.format(where))       

    def get_campaigns(self, script_name):
        where = "script_name = '{}'".format(script_name)
        return self.db.select_dataframe(GET.format(where))

    def get_script_names(self, campaign_id):
        where = "campaign_id = {}".format(campaign_id)
        return self.db.select_dataframe(GET.format(where))

    def get_row(self, script_name, campaign_id):
        get_where = "campaign_id = {} and script_name='{}'".format(campaign_id, script_name)
        print (GET.format(get_where))
        return self.db.select_dataframe(GET.format(get_where))

    def get(self,*args):
        script_name = self.get_argument("script_name", False)
        campaign_id = self.get_argument("campaign_id", False)

        if len(args) > 0:
            script_name = args[0]
            results = self.get_campaigns(script_name)

        elif script_name and campaign_id:
            results = self.get_row(script_name, campaign_id)

        elif script_name:
            script_name = self.get_argument("script_name")
            results = self.get_campaigns(script_name)

        elif campaign_id:
            campaign_id = self.get_argument("campaign_id")
            results = self.get_script_names(campaign_id)

        else:
            results = self.get_all()

        as_json = Convert.df_to_json(results)
        self.write(as_json)
        self.finish()

    def make_to_insert(self,body):
        print body

        # Get POSTed data
        obj = ujson.loads(body)

        # Make list of all relevant POSTed columns
        all_cols = [ i for i in self.required_cols if i in obj.keys() ]

        # Check that the POSTed columns are correct
        if len(all_cols) != len(self.required_cols):
            raise Exception("required_columns: script_name, campaign_id")

        script_name = obj["script_name"]
        campaign_id = obj["campaign_id"]

        try:
            new_row = {"script_name": script_name, "campaign_id": campaign_id}
            self.db.execute(INSERT % new_row)
            print (INSERT % new_row)
        
        except Exception as e:
            # Roll back any changes that might have occurred
            raise Exception("Error during INSERT execution: {}".format(e))
    
        return self.get_row(script_name, campaign_id)


    def post(self):
        try:
            print self.request.body
            data = self.make_to_insert(self.request.body)
            as_json = Convert.df_to_json(data)
            self.write(ujson.dumps({"response": ujson.loads(as_json), "status": "ok"}))
        except Exception, e:
            self.write(ujson.dumps({"response": str(e), "status": "error"}))
