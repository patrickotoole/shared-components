import tornado.web
import ujson
import pandas
from lib.helpers import Convert
from funnel_base import FunnelBase, FunnelHelpers

GET = """
SELECT * from action where %(where)s
"""

GET_PATTERNS = """
SELECT *  from action_patterns where %(where)s
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

UPDATE_ACTION = """
UPDATE action SET %(fields)s
WHERE action_id = %(action_id)s
"""

DELETE_ACTION_PATTERNS = """
DELETE FROM action_patterns where action_id = %(action_id)s and url_pattern = "%(url_pattern)s"
"""

DELETE_ACTION = """
DELETE FROM action where action_id = %(action_id)s
"""

DELETE_ACTION_PATTERN = """
DELETE FROM action_patterns where action_id = %(action_id)s
"""
 


class ActionHandler(FunnelBase):

    def initialize(self, db=None, **kwargs):
        self.db = db 

        self.required_cols = [
            "advertiser",
            "action_name",
            "operator"
        ]

    def get_patterns(self,ids):
        where = "action_id in (%s)" % ",".join(map(str,ids))
        patterns = self.db.select_dataframe(GET_PATTERNS % {"where":where})
        grouped = patterns.groupby("action_id").agg(lambda x: x.T.to_dict().values())
        return grouped
   
    def get_all(self):
        where = "1=1"
        result = self.db.select_dataframe(GET % {"where":where})
        patterns = self.get_patterns(result.action_id.tolist())
        joined = result.set_index("action_id").join(patterns)

        return joined.reset_index()

    def get_advertiser_actions(self, advertiser):
        try:
            where = "pixel_source_name = '{}'".format(advertiser)
            result = self.db.select_dataframe(GET % {"where":where})
            patterns = self.get_patterns(result.action_id.tolist())
            joined = result.set_index("action_id").join(patterns)

            return joined.reset_index()
        except:
            return pandas.DataFrame()
         
    @tornado.web.authenticated
    def get(self):
        advertiser = self.get_argument("advertiser", False)

        if not advertiser:
            advertiser = self.current_advertiser_name

        format = self.get_argument("format",False)
        if format == "json":
            if advertiser:
                results = self.get_advertiser_actions(advertiser)
            else:
                results = self.get_all()

            as_json = Convert.df_to_json(results)
            self.write(as_json)
            self.finish()
        else:
            self.render("analysis/visit_urls.html",data="")


    def check_required(self,obj):
        all_cols = [ i for i in self.required_cols if i in obj.keys() ]

        print all_cols, self.required_cols
        
        # Check that the POSTed columns are correct
        if len(all_cols) != len(self.required_cols):
            raise Exception("required_columns: {}".format(', '.join(self.required_cols)))
         

    def make_to_insert(self,body):

        action = ujson.loads(body)
        action = dict(action.items() + [("start_date","0"),("end_date","0")])

        try:
            
            self.db.autocommit = False
            conn = self.db.create_connection()
            cur = conn.cursor()

            self.check_required(action) 
            
            cur.execute(INSERT_ACTION % action)
            action_id = cur.lastrowid

            for url in action["url_pattern"]:
                pattern = {
                    "action_id": action_id, 
                    "url_pattern": url
                } 
                cur.execute(INSERT_ACTION_PATTERNS % pattern)

            action['action_id'] = action_id
            conn.commit()

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            self.db.autocommit = True            

        return action

    def make_to_update(self,body):

        action = ujson.loads(body)
        
        try:
            
            self.db.autocommit = False
            conn = self.db.create_connection()
            cur = conn.cursor()

            if (action.get("action_id",False) == False):
                raise Exception("Need action_id to update action") 
             

            excludes = ["action_id","url_pattern","advertiser"]
            fields = ", ".join(["%s=\"%s\"" % (i,j) for i,j in action.items() if not (i in excludes)])
            action['fields'] = fields
            
            cur.execute(UPDATE_ACTION % action)

            where = "action_id = %s" % action['action_id']
            existing_df = self.db.select_dataframe(GET_PATTERNS % {"where":where})

            to_remove = existing_df[~existing_df.url_pattern.isin(action["url_pattern"])].url_pattern.tolist()
            to_add = [url for url in action["url_pattern"] if str(url) not in existing_df.url_pattern.tolist()]


            for url in to_add:
                pattern = {
                    "action_id": action["action_id"], 
                    "url_pattern": url
                } 
                cur.execute(INSERT_ACTION_PATTERNS % pattern)

            for url in to_remove:
                pattern = {
                    "action_id": action["action_id"], 
                    "url_pattern": url
                } 
                cur.execute(DELETE_ACTION_PATTERNS % pattern)
                 
            conn.commit()

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            self.db.autocommit = True            

        return action

    @tornado.web.authenticated
    def put(self):
        try:
            print self.request.body
            data = self.make_to_update(self.request.body)
            as_json = data
            self.write(ujson.dumps({"response": as_json, "status": "ok"}))
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))

    @tornado.web.authenticated
    def delete(self):
        action_id = self.get_argument("action_id",False)
        if not action_id:
            self.write("failed to delete, missing ?action_id=")
            self.finish()
            return
        action = {"action_id":action_id}
        try:
            self.db.autocommit = False
            conn = self.db.create_connection()
            cur = conn.cursor()
            
            cur.execute(DELETE_ACTION % action)
            cur.execute(DELETE_ACTION_PATTERN % action) 
                
            conn.commit()

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            self.db.autocommit = True            
        self.write("ok")
        self.finish()

    @tornado.web.authenticated
    def post(self):
        body = self.request.body
        if "advertiser" not in body:
            body["advertiser"] = self.current_advertiser

        try:
            print body
            if "action_id" in body:
                raise Exception("Can't post and include an action_id")
            else:
                data = self.make_to_insert(body)
            as_json = data
            self.write(ujson.dumps({"response": as_json, "status": "ok"}))
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))

    def check_auth_GET(self):
        action = self.get_argument("id",False)
        advertiser = self.get_argument("advertiser", False)

        # If neither is specified, we don't need to return anything
        if not action and not advertiser:
            return self.get_secure_cookie("user")

        # If they specified a action_id, check that they have access to
        # its advertiser
        if action:
            requested_advertiser = self.action_to_advertiser(action)
            exception_message = "Action not found"
        else:
            requested_advertiser = advertiser
            exception_message = ("The specified advertiser either doesn't exist"
                                 " or you do not have access to it")

        if (requested_advertiser in self.authorized_advertisers):
            return self.get_secure_cookie("user")
        else:
            raise Exception(exception_message)

    def check_auth_PUT_POST(self):
        body = ujson.loads(self.request.body)
        if "advertiser" not in body:
            return self.get_secure_cookie("user")

        # Check that this user has access to the advertiser they're trying to
        # create a action for
        requested_advertiser = body["advertiser"]

        if (requested_advertiser in self.authorized_advertisers):
            return self.get_secure_cookie("user")
        else:
            raise Exception(("The specified advertiser either doesn't exist or"
                             " you do not have access to it"))
        return self.get_secure_cookie("user")

    def check_auth_DELETE(self):
        action = self.get_argument("id",False)

        # If neither is specified, we don't need to return anything
        if not action:
            return self.get_secure_cookie("user")

        requested_advertiser = self.action_to_advertiser(action)
        exception_message = "Action not found"

        if (requested_advertiser in self.authorized_advertisers):
            return self.get_secure_cookie("user")
        else:
            raise Exception(exception_message)

    def action_to_advertiser(self, action_id):
        query = "SELECT pixel_source_name FROM rockerbox.action WHERE action_id=%s" % action_id
        df = self.db.select_dataframe(query)
        if len(df) < 1:
            return Exception("No action found")
        else:
            return df.pixel_source_name[0]

    def get_current_user(self):
        if self.request.method == "GET":
            return self.check_auth_GET()
        elif self.request.method in ["POST", "PUT"]:
            return self.check_auth_PUT_POST()
        elif self.request.method == "DELETE":
            return self.check_auth_DELETE()
