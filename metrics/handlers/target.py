import tornado.web
import ujson
import pandas
from lib.helpers import *
from tornado.httpclient import AsyncHTTPClient
from tornado.httpclient import HTTPClient


pandas.options.display.max_colwidth = 1000

BUTTON   = """<button id="%(action)s=%(_id)s" type="button" class="%(name)s %(hidden)s btn %(class)s">%(name)s</button>"""
INPUT    = """<input class="form-control" id="%(name)s" name="%(name)s" placeholder="%(placeholder)s">"""
SEGMENT  = INPUT % {"name":"segment","placeholder":"segment code"}
PATTERN  = """<input class="form-control" id="pattern" name="pattern" placeholder="pattern to match">"""
LOG      = """<input class="form-control" id="log" name="log" placeholder="domain list logging name">"""

button_classes = {
    "enable" :"btn-success",
    "delete" :"btn-danger remove",
    "disable":"btn-warning remove"
}

def button_builder(_id, name, toggle):
    button_params = {
        "_id": _id,
        "action": name,
        "name": name,
        "class": button_classes[name],
        "hidden": "" if toggle else "hidden"
    }
    return BUTTON % button_params

def buttons(name, active):
    enable  = button_builder(name, "enable", not active)
    disable = button_builder(name, "disable", active)
    delete  = button_builder(name, "delete", not active)
    return enable + disable + delete

BOXES = [
    "162.243.254.140", "107.170.106.25", "162.243.242.74", "107.170.91.245", "162.243.85.197", 
    "107.170.71.81", "107.170.34.108", "192.241.187.161", "107.170.4.34", "107.170.14.109", 
    "107.170.116.84", "107.170.116.105", "107.170.116.94", "162.243.237.28", "107.170.160.19", 
    "162.243.235.62", "107.170.146.225", "107.170.171.102", "162.243.218.228", "107.170.28.193", 
    "162.243.224.211", "162.243.239.170", "107.170.126.48"
]

def x(y):
    print y
    return (y.name, y.active)

def default_renderer(self,data,*args):
    profile_df = data.copy()
    profile_df['Actions'] = profile_df.T.apply(lambda row: buttons(row.name, row.active))

    profile_df = profile_df.append(pandas.DataFrame([{
        "log":LOG,
        "pattern":PATTERN,
        "segment": SEGMENT,
        "Actions": """<button type="submit" id="add-target" class="submit btn btn-success">Add</button>"""

    }]))

    formatted = profile_df[["log","pattern","segment","Actions"]].to_html(
        escape=False,
        classes="table table-condensed\" id=\"targets"
    )

    self.render(
        "../templates/_targeting.html",
        df_html=formatted,
        profile=Convert.df_to_json(data)
    )

class TargetingBase(tornado.web.RequestHandler):

    def initialize(self, api=None, redis=None,db=None):
        self.redis = redis
        self.db = db
    
    def update_boxes(self,boxes=BOXES):
        http_client = HTTPClient() 
        for ip in boxes:
            response = http_client.fetch("http://%s:8888/load_profile" % ip)
        http_client.close()

    def update_profile(self):
        df = self.get_targets("active = 1")
        content = Convert.df_to_json(df)
        self.redis.set("profile",content)

    def get_profile(self,formatter=ujson.loads):
        return formatter(self.redis.get("profile"))

    def get_targets(self,where="1=1"):
        df = self.db.select_dataframe("SELECT * FROM domain_list WHERE %s" % where)
        df = df.set_index("id")
        return df

    def add_target(self,target):
        self.db.execute("INSERT INTO domain_list (`log`, `pattern`, `segment`, `active`) VALUES (\"%(log)s\", \"%(pattern)s\", \"%(segment)s\", 1) " % target)
        self.db.commit()

    def disable_target(self,_id):
        self.db.execute("UPDATE domain_list SET `active` = 0 WHERE id = %s " % _id)
        self.db.commit()

    def delete_target(self,_id):
        self.db.execute("DELETE from domain_list WHERE id = %s " % _id)
        self.db.commit()

    def enable_target(self,_id):
        self.db.execute("UPDATE domain_list SET `active` = 1 WHERE id = %s " % _id)
        self.db.commit()



class TargetingHandler(TargetingBase):
    
    def initialize(self,api=None, redis=None,db=None):
        super(TargetingHandler,self).initialize(api=api,redis=redis,db=db)

    @decorators.formattable
    def get(self,*args,**kwargs):
        data = self.get_targets()
        yield default_renderer, (data,)

    def delete(self):
        disable = self.get_argument("disable",False)
        if disable:
            self.disable_target(disable)
            self.update_profile()
            self.update_boxes()

        delete = self.get_argument("delete",False)
        if delete:
            self.delete_target(delete)

    def post(self):
        enable = self.get_argument("enable",False)
        if enable:
            self.enable_target(enable)
            last = []
        else:
            targets = ujson.loads(self.request.body)
            last = targets[-1]
            self.add_target(last)

        self.update_profile()
        self.update_boxes()

        json = ujson.dumps(last)
        self.write(json)
