import tornado.web
import ujson
import logging
import copy
from lib.helpers import Convert, decorators, Model
from lib.query.MYSQL import DOMAIN_LIST_STATUS

OPTIONS = {
    "default": {
        "meta": {
            "groups" : ["domain_list","action","pattern","segment"],
            "fields" : ["served","loaded","visible","percent_visible","percent_loaded"],
            "formatters" : {
                "pattern":"editable",
                "segment":"editable",
                "domain_list":"editable",
                "percent_visible":"percentFormat",
                "percent_loaded":"percentFormat"

            },
            "is_wide":True,
        }
    }
}

FIELD_MAPPING = {
    "domain_list":"log as domain_list"
}

FIXED = [
    "id as __id__",
    "concat(log,CASE WHEN action is not null then action else 'learn' end) as __index__"
]
 



class DomainList(object):

    def __init__(self):
        pass

    @Model.run_select
    def select(self,fields=[],where=["1=1"]):

        fields = fields + FIXED
        fields = [FIELD_MAPPING.get(f) if FIELD_MAPPING.get(f,False) else f for f in fields] 

        params = {
            "fields" : ",".join(fields),
            "where" : " and ".join(where)
        }

        print DOMAIN_LIST_STATUS % params

        return DOMAIN_LIST_STATUS % params

    @Model.run_query
    def update(self,obj):
        QUERY = "UPDATE domain_list set %(updates)s WHERE %(where)s"
        
        params = {
            "updates" : ",".join([ "%s = '%s'" % (i,j) for i,j in  obj.iteritems()]),
            "where" : "id = %s " % obj['id']
        }

        return QUERY % params



        


class VenueBlock(object):
    pass

class DomainViewabilityHandler(tornado.web.RequestHandler,DomainList):

    def make_where(self):
        return "1=1"

    def get_domain_list(self,meta):
        fields = meta['groups'] + meta['fields']
        where = self.make_where()

        df = self.select(fields,where)
        df['action'] = df.action.fillna("learn")

        df = df[fields + ["__id__","__index__"]]

        self.get_content(df)
        
class ViewabilityHandler(DomainViewabilityHandler):

    def initialize(self, db, api):
        self.db = db 
        self.api = api

    def make_where(self):
        where = ["1=1"]
        action = self.get_argument("action",False)
        domain_list = self.get_argument("domain_list",False)


        if action == "learn":
            where += ["action is null"]
        elif action:
            where += ["action = '%s' " % action]
        
        if domain_list:
            where += ["log = '%s' " % domain_list]
        else:
            if not action:
                where += ["action = 'approve' "]


        return where

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("admin/reporting/viewability_status.html", data=o)

        yield default, (data,)
         

    def get(self,*args):
        meta = copy.copy(OPTIONS["default"]["meta"])

        if args[0] == "domain_list":

            if len(args) > 1 and args[1] == "meta":
                
                if self.get_argument("domain_list",False) is not False:
                    meta['groups'] = meta['groups'][1:] 

                jmeta = ujson.dumps(meta)
                self.write(jmeta)
                self.finish()
            else:
                self.get_domain_list(meta)

    def put(self,*args):
        
        obj = ujson.loads(self.request.body) if len(self.request.body) else {}

        if obj.get("id",False):
            self.update(obj)
            self.write(obj)
        self.finish()

        

    def post(self,*args):
        pass
