import tornado.web
import ujson
from lib.helpers import Convert

GET = """
SELECT * from action where %(where)s
"""

INSERT_ACTION = """
INSERT INTO action
    (start_date, end_date, operator, pixel_source_name, action_name) 
VALUES
    ("%(start_date)s", "%(end_date)s", "%(operator)s", "%(advertiser)s", "%(action_name)s")
"""

INSERT_ACTION_PATTERNS = """
INSERT INTO action_patterns (action_id, url_pattern)
VALUES (%(action_id)s, "%(url_pattern)s")
"""

class ActionHandler(tornado.web.RequestHandler):

    def initialize(self, db=None, **kwargs):
        self.db = db 

        self.required_cols = [
            "advertiser",
            "action_name",
            "operator"
        ]
   
    def get_all(self):
        where = "1=1"
        result = self.db.select_dataframe(GET % {"where":where})
        return result

    def get_advertiser_actions(self, advertiser):
        where = "pixel_source_name = '{}'".format(advertiser)
        return self.db.select_dataframe(GET % {"where":where})
   

    def get(self):
        advertiser = self.get_argument("advertiser", False)
        if advertiser:
            results = self.get_advertiser_actions(advertiser)
        else:
            results = self.get_all()

        as_json = Convert.df_to_json(results)
        self.write(as_json)
        self.finish()

    def check_required(self,obj):
        all_cols = [ i for i in self.required_cols if i in obj.keys() ]
        
        # Check that the POSTed columns are correct
        if len(all_cols) != len(self.required_cols):
            raise Exception("required_columns: {}".format(', '.join(self.required_cols)))
         

    def make_to_insert(self,body):

        action = ujson.loads(body)
        action = dict(action.items() + [("start_date","0"),("end_date","0")])
        
        try:
            self.check_required(action)
            self.db.autocommit = False
            conn = self.db.create_connection()
            cur = conn.cursor()
            
            cur.execute(INSERT_ACTION % action)
            action_id = cur.lastrowid

            for url in action["url_patterns"]:
                pattern = {
                    "action_id": action_id, 
                    "url_pattern": url
                } 
                cur.execute(INSERT_ACTION_PATTERNS % pattern)

            conn.commit()

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            self.db.autocommit = True            

        return action

    def post(self):
        try:
            data = self.make_to_insert(self.request.body)
            as_json = data
            self.write(ujson.dumps({"response": as_json, "status": "ok"}))
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))

