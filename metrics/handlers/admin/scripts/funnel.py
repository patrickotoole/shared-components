import tornado.web
import ujson
from lib.helpers import Convert

GET = """
SELECT * 
FROM funnel a 
    JOIN action b 
    JOIN funnel_actions c 
    JOIN action_patterns d 
ON (
    a.funnel_id = c.funnel_id and 
    b.action_id = c.action_id and 
    b.action_id = d.action_id
);
"""

INSERT_FUNNEL = """
INSERT INTO rockerbox.funnel
    (funnel_name, operator, owner, pixel_source_name) 
VALUES 
    ("%(funnel_name)s", "%(operator)s", "%(owner)s", "%(advertiser)s")
"""

INSERT_ACTION = """
INSERT INTO rockerbox.action
    (start_date, end_date, operator) 
VALUES
    ("%(start_date)s", "%(end_date)s", "%(operator)s")
"""

INSERT_ACTION_PATTERNS = """
INSERT INTO rockerbox.action_patterns
    (action_id, url_pattern)
VALUES
    (%(action_id)s, "%(url_pattern)s")
"""

INSERT_FUNNEL_ACTIONS = """
INSERT INTO rockerbox.funnel_actions
    (funnel_id, action_id)
VALUES
    (%(funnel_id)s, %(action_id)s)
"""

class FunnelHandler(tornado.web.RequestHandler):

    def initialize(self, reporting_db=None, api=None, db=None):
        self.db = reporting_db 
        self.api = api

        self.required_cols = [
            "advertiser",
            "operator",
            "funnel_name",
            "actions",
            "owner"
            ]

    def get_all(self):
        where = "1=1"
        return self.db.select_dataframe(GET.format(where))       

    def get_advertiser_funnels(self, advertiser):
        where = "pixel_source_name = '{}'".format(advertiser)
        return self.db.select_dataframe(GET.format(where))

    def get(self,*args):
        advertiser = self.get_argument("advertiser", False)

        if advertiser:
            results = self.get_advertiser_groups(advertiser)
        else:
            results = self.get_all()

        as_json = Convert.df_to_json(results)
        self.write(as_json)
        self.finish()

    def deserialize():
        pass

    def serialize():
        pass

    def make_to_insert(self,body):

        # Get POSTed data
        obj = ujson.loads(body)

        # Make list of all relevant POSTed columns
        all_cols = [ i for i in self.required_cols if i in obj.keys() ]
        
        # Check that the POSTed columns are correct
        if len(all_cols) != len(self.required_cols):
            raise Exception("required_columns: {}".format(', '.join(self.required_cols)))

        # Add funnel id to all_cols
        obj["funnel_id"] = 1


        try:
            self.db.autocommit = False
            conn = self.db.create_connection()
            cur = conn.cursor()
            
            # Insert and get id of new funnel
            print INSERT_FUNNEL % obj
            cur.execute(INSERT_FUNNEL % obj)
            funnel_id = cur.lastrowid

            # For each action in this funnel
            for action in obj["actions"]:
                print INSERT_ACTION % action
                cur.execute(INSERT_ACTION % action)
                action_id = cur.lastrowid

                cur.execute(INSERT_FUNNEL_ACTIONS % {
                        "action_id": action_id,
                        "funnel_id": funnel_id
                        })

                for url in action["url_patterns"]:
                    cur.execute(INSERT_ACTION_PATTERNS % {
                            "action_id": action_id, 
                            "url_pattern": url
                            })

            conn.commit()

        except Exception as e:
            print e
            conn.rollback()
            raise e
        finally:
            self.autocommit = True            

        return True

    def post(self):
        print tornado.escape.json_decode(self.request.body)

        try:
            data = self.make_to_insert(self.request.body)
            as_json = Convert.df_to_json(data)
            self.write(ujson.dumps({"response": ujson.loads(as_json), "status": "ok"}))
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))

