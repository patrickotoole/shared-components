import tornado.web
import logging
import json

import lib.execution.build


def bound_env(cc):

    def custom_script(path,params={}):
    
        env = lib.execution.build.build_execution_env_from_db(cc)
    
        try:
            response = env.run(path,params)
            return response
        except Exception as e: 
            return e

    return custom_script



class APIHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("db",False)
        self.env = bound_env(self.db)

    def run(self,path,params):
        # to defer
        return self.env(path,params)

    def get_index(self):
        df = self.db.select_dataframe("SELECT * from workqueue_scripts where api = 1 and active = 1 and deleted = 0 ")

        self.write(df.to_html())
        self.finish()

    def get(self,path=False):

        if path == "": return self.get_index()

        params = self.request.arguments

        params = { i:j[0] for i,j in params.items() }
        resp = self.run(path,params)

        self.write({"endpoint":path,"response":resp})
        self.finish()

