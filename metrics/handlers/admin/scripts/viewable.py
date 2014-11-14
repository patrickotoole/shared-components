import tornado.web
import ujson
import logging
from lib.helpers import Convert, decorators

OPTIONS = {
    "default": {
        "meta": {
            "groups" : ["domain_list","action","pattern"],
            "fields" : ["imps","served","loaded","visible","percent_visible"],
            "formatters" : {
                "campaign":"none",
                "spent": "cpm",
                "tag":"none",
                "seller":"none",
                "action":"none"
            },
            "is_wide":True
        }
    }
}
 

DOMAIN_LIST = """
SELECT 
    concat(log,CASE WHEN action is not null then action else 'learn' end) as __index__, 
    log as domain_list, 
    pattern, 
    action, 
    visible, 
    loaded, 
    served, 
    percent_visible,
    percent_loaded
FROM 
    domain_list dl 
LEFT JOIN 
    reporting.domain_list_change_ref ref 
ON 
    ref.domain = dl.pattern where %s
"""


class DomainList(object):
    pass

class VenueBlock(object):
    pass

class DomainViewabilityHandler(tornado.web.RequestHandler):

    def make_where(self):
        return "1=1"

    def get_domain_list(self):
        where = self.make_where()
        df = self.db.select_dataframe(DOMAIN_LIST % where)
        df['action'] = df.action.fillna("learn")

        self.get_content(df)
        
class ViewabilityHandler(DomainViewabilityHandler):

    def initialize(self, db, api):
        self.db = db 
        self.api = api

    def make_where(self):
        where = "1=1"
        action = self.get_argument("action",False)
        domain_list = self.get_argument("domain_list",False)

        if action:
            where += " and action = '%s' " % action

        if domain_list:
            where += " and log = '%s' " % domain_list

        return where

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("admin/reporting/viewability_status.html", data=o)

        yield default, (data,)
         

    def get(self,*args):
        if args[0] == "domain_list":
            if len(args) > 1 and args[1] == "meta":
                meta = OPTIONS["default"]["meta"]
                if self.get_argument("domain_list",False) is not False:
                    meta['groups'] = meta['groups'][1:]
                jmeta = ujson.dumps(meta)
                self.write(jmeta)
                self.finish()
            else:
                self.get_domain_list()
        

    def post(self):
        pass
